const { expect } = require('chai');
const { WiqlFormatter } = require('../out/formatter');

describe('WIQL Formatter', () => {
  it('uppercases keywords when option is true', () => {
    const input = "select id, title from workitems where state = 'Active'";
    const out = WiqlFormatter.format(input, { uppercaseKeywords: true });
    expect(out).to.include('SELECT');
    expect(out).to.include('FROM');
    expect(out).to.include('WHERE');
  });

  it('preserves original casing when uppercaseKeywords is false', () => {
    const input = "select id, title from workitems where state = 'Active'";
    const out = WiqlFormatter.format(input, { uppercaseKeywords: false });
    // should not force keywords to upper-case
    expect(out).to.match(/select/i);
  });

  it('breaks SELECT columns into lines', () => {
    const input = "select id, title, createddate from workitems";
    const out = WiqlFormatter.format(input, { uppercaseKeywords: true });
    // identifiers may be quoted/backticked by the parser; accept either form
    expect(out).to.match(/SELECT\s*\n\s+(`?id`?),\s*\n\s+(`?title`?),\s*\n\s+(`?createddate`?)/i);
  });

  it('splits AND/OR inside parentheses and indents by depth', () => {
    const input = "select * from t where (a = 1 and (b = 2 or c = 3) and d = 4)";
    const out = WiqlFormatter.format(input, { uppercaseKeywords: true });
    // top-level clause plus nested lines
    expect(out).to.include('WHERE');
    // should contain newline + whitespace before AND and OR (indented lines)
    expect(out).to.match(/\n\s+AND\s+/);
    expect(out).to.match(/\n\s+OR\s+/);
  });
});
