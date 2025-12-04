const KEYWORDS = [
  'SELECT','FROM','WHERE','AND','OR','ORDER','BY','GROUP','HAVING','JOIN','INNER','LEFT','RIGHT','ON','AS','IN','NOT','EXISTS','TOP','DESC','ASC'
];

function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
import { parseAndNormalize } from './parser';

export interface WiqlFormatterOptions {
  uppercaseKeywords?: boolean;
}

export class WiqlFormatter {
  static format(input: string, options?: WiqlFormatterOptions): string {
    const uppercase = options?.uppercaseKeywords ?? true;
    // Basic approach: normalize whitespace, uppercase keywords, keep newlines for readability.
    // 1) Collapse multiple spaces/tabs into single space
    // Normalize newlines
    let text = input.replace(/\r\n/g, '\n');

    // Use parser to normalize only when uppercase option is enabled.
    // Parsing can normalize casing (identifiers/keywords), so when the user
    // wants to preserve original casing (`uppercaseKeywords=false`) we skip
    // parser normalization and fall back to the heuristic extractor.
    let extractedStrings: string[] | undefined = undefined;
    if (uppercase) {
      try {
        const normalized = parseAndNormalize(text);
        text = normalized;
      } catch (err) {
        // If parsing fails, fall back to extracting strings so heuristic formatting can proceed
        extractedStrings = [];
        text = text.replace(/'([^']|'')*'/g, (m) => {
          const idx = extractedStrings!.length;
          extractedStrings!.push(m);
          return `__STR${idx}__`;
        });
      }
    } else {
      // preserve original text casing: extract strings and continue heuristic formatting
      extractedStrings = [];
      text = text.replace(/'([^']|'')*'/g, (m) => {
        const idx = extractedStrings!.length;
        extractedStrings!.push(m);
        return `__STR${idx}__`;
      });
    }

    // 1) Collapse tabs to spaces and reduce multiple spaces to one
    text = text.replace(/\t/g, ' ').replace(/ {2,}/g, ' ');

    // 2) Normalize spaces around commas
    text = text.replace(/\s*,\s*/g, ', ');

    // 3) Uppercase keywords when they appear as separate words (if enabled)
    if (uppercase) {
      for (const kw of KEYWORDS) {
        const re = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'ig');
        text = text.replace(re, (m) => m.toUpperCase());
      }
    }

    // 4) Put major clauses on their own lines for readability
    // Handle multi-word keywords first
    text = text.replace(/\bORDER\s+BY\b/ig, 'ORDER BY');
    text = text.replace(/\bGROUP\s+BY\b/ig, 'GROUP BY');

    // Insert newline before WHERE, GROUP BY, HAVING, ORDER BY, JOIN
    text = text.replace(/\n+/g, '\n');
    text = text.replace(/\s*\b(WHERE|GROUP BY|HAVING|ORDER BY|INNER JOIN|LEFT JOIN|RIGHT JOIN|JOIN)\b\s*/ig, (m) => '\n' + m.trim() + ' ');

    // 5) Format SELECT columns: place each column on its own indented line
    const selFrom = /\bSELECT\b([\s\S]*?)\bFROM\b/ig.exec(text);
    if (selFrom) {
      const cols = selFrom[1].trim();
      // split by top-level commas (ignore commas inside parentheses)
      const parts: string[] = [];
      let cur = '';
      let depth = 0;
      for (let i = 0; i < cols.length; i++) {
        const ch = cols[i];
        if (ch === '(') { depth++; cur += ch; continue; }
        if (ch === ')') { depth = Math.max(0, depth - 1); cur += ch; continue; }
        if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim() !== '') parts.push(cur.trim());

      const formattedCols = parts.map((p) => '  ' + p).join(',\n');
      // replace the SELECT ... FROM segment
      text = text.replace(selFrom[0], `SELECT\n${formattedCols}\nFROM `);
    }

    // 5.5) Split AND / OR in WHERE/HAVING into indented new lines, including inside parentheses
    // Indentation: two spaces per nesting level (top-level => 2 spaces).
    function splitConjunctionsWithDepth(clause: string): string {
      let out = '';
      let i = 0;
      let depth = 0;
      let inSingle = false;
      let inDouble = false;
      let inBacktick = false;
      let inBracket = false; // for [bracketed] identifiers

      while (i < clause.length) {
        const ch = clause[i];
        // handle quote/bracket toggles
        if (ch === "'" && !inDouble && !inBacktick && !inBracket) { inSingle = !inSingle; out += ch; i++; continue; }
        if (ch === '"' && !inSingle && !inBacktick && !inBracket) { inDouble = !inDouble; out += ch; i++; continue; }
        if (ch === '`' && !inSingle && !inDouble && !inBracket) { inBacktick = !inBacktick; out += ch; i++; continue; }
        if (ch === '[' && !inSingle && !inDouble && !inBacktick) { inBracket = true; out += ch; i++; continue; }
        if (ch === ']' && inBracket) { inBracket = false; out += ch; i++; continue; }

        if (!inSingle && !inDouble && !inBacktick && !inBracket) {
          if (ch === '(') { depth++; out += ch; i++; continue; }
          if (ch === ')') { depth = Math.max(0, depth - 1); out += ch; i++; continue; }
        }

        // When not inside any quote/bracket, detect AND/OR as whole words anywhere (including inside parentheses)
        if (!inSingle && !inDouble && !inBacktick && !inBracket) {
          const rest = clause.slice(i);
          const m = /^\s*(AND|OR)\b/i.exec(rest);
          if (m) {
            // compute indent: two spaces per depth, add one extra level so first-level is 2 spaces
            const indentLevel = Math.max(0, depth + 0);
            const indent = '  '.repeat(indentLevel + 1);
            out = out.trimRight();
            out += '\n' + indent + m[1].toUpperCase() + ' ';
            // advance past the matched token and skip any spaces after it
            const startOfMatch = i + rest.indexOf(m[1]);
            let j = startOfMatch + m[1].length;
            while (j < clause.length && /\s/.test(clause[j])) j++;
            i = j;
            continue;
          }
        }

        out += ch; i++;
      }
      return out;
    }

    // Apply splitting to WHERE and HAVING clauses only (case-insensitive)
    text = text.replace(/\b(WHERE|HAVING)\b([\s\S]*?)(?=(\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$))/ig, (_m, kw, rest) => {
      const prefix = kw.toUpperCase();
      const body = rest.trim();
      let split = splitConjunctionsWithDepth(body);
      // ensure the replaced clause ends with a newline so next clause starts on new line
      if (!/\n$/.test(split)) split = split + '\n';
      return prefix + ' ' + split;
    });

    // 6) Trim spaces at line ends and remove duplicate blank lines
    text = text.split('\n')
      .map(l => l.trimRight())
      .filter((line, idx, arr) => { if (line === '' && idx > 0 && arr[idx-1] === '') return false; return true; })
      .join('\n');

    // 7) Restore string literals if we extracted any
    if (extractedStrings) {
      text = text.replace(/__STR(\d+)__/g, (_m, g1) => extractedStrings![Number(g1)] || '');
    }

    if (!text.endsWith('\n')) text += '\n';
    return text;
  }
}
