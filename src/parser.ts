import { Parser } from 'node-sql-parser';

const parser = new Parser();

export function parseAndNormalize(sql: string): string {
  // The node-sql-parser supports many SQL dialects; WIQL is SQL-like.
  // We attempt to parse and then sqlify to get a normalized SQL string.
  const cleaned = sql.replace(/\r\n/g, '\n');
  try {
    const ast = parser.astify(cleaned);
    // sqlify will produce a normalized SQL string from the AST
    const normalized = parser.sqlify(ast);
    return normalized;
  } catch (err) {
    // rethrow the error to let caller handle fallback
    throw err;
  }
}
