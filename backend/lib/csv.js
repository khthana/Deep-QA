'use strict';

/**
 * Reading and writing the import file — ticket #11.
 *
 * The format is CSV, and that is a decision worth stating rather than
 * discovering. The inherited system imports `.xlsx` through `xlsx@0.18.5`,
 * which is the version npm still serves and which carries unpatched
 * prototype-pollution and ReDoS advisories - the maintainer moved distribution
 * off npm rather than publish a fix there. Adding it to a fresh tree, in a
 * public repository, on a rebuild whose premise is not carrying the inherited
 * defects forward, is not a thing to do by default.
 *
 * CSV costs no dependency, is what a spreadsheet saves when asked to, and
 * opens again in one. The ticket asks for "download the template the system
 * provides, upload a completed file, and receive a per-row report", and every
 * word of that is satisfied. If true `.xlsx` is wanted later it is a
 * deliberate call about a dependency, and the shape here does not change: a
 * different reader in front of the same rows.
 *
 * Small on purpose. This handles the part of RFC 4180 a spreadsheet actually
 * emits - commas, quoted fields, doubled quotes inside them, CRLF - and does
 * not attempt to be a general parser.
 */

/** Strips the UTF-8 byte-order mark Excel writes at the head of a saved CSV. */
const BOM = '\uFEFF';

/**
 * The rows of a CSV, as arrays of strings.
 *
 * Character at a time rather than split(','), because a field may contain a
 * comma or a newline when it is quoted, and every name in this system is
 * eventually a Thai name somebody typed a comma into.
 */
function parseRows(text) {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let started = false;

  const endField = () => {
    row.push(field);
    field = '';
    started = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (source[i + 1] === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        field += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"' && !started) {
      quoted = true;
      started = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\r') {
      // Swallowed; the \n that follows ends the row. A lone \r is not a line
      // ending any spreadsheet has written this century.
    } else if (char === '\n') {
      endRow();
    } else {
      field += char;
      started = true;
    }
  }

  // A file that does not end in a newline still has a last row, and one that
  // does must not gain an empty one.
  if (field !== '' || row.length > 0) endRow();

  // Blank lines - a trailing one, or the gap a person left mid-file - are not
  // rows to report an error against.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/**
 * The rows as objects keyed by the header line, with a `line` on each.
 *
 * `line` is the number the person sees in their spreadsheet: the header is
 * line 1 and the first record is line 2. The per-row report names it, and a
 * report that named a zero-based index into an array would be a report nobody
 * could act on.
 *
 * Unknown headers are kept rather than refused. A file exported from somewhere
 * else carries columns this system has no use for, and rejecting it for that
 * would make the template the only file that ever imports.
 */
function parseTable(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map((cell) => cell.trim());
  const records = rows.slice(1).map((cells, index) => {
    const record = { line: index + 2 };
    headers.forEach((header, column) => {
      record[header] = (cells[column] ?? '').trim();
    });
    return record;
  });

  return { headers, records };
}

/** One field, quoted if it has to be. */
const quote = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * A CSV document from a header list and rows of objects.
 *
 * CRLF and the byte-order mark are both for Excel: without the mark it reads a
 * Thai template as mojibake, which makes the template unusable by exactly the
 * people it is for.
 */
function formatCsv(headers, rows = []) {
  const lines = [headers.map(quote).join(',')];
  for (const row of rows) lines.push(headers.map((header) => quote(row[header])).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

module.exports = { parseRows, parseTable, formatCsv };
