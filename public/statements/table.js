/* Recovering a table from a PDF.
 *
 * A PDF has no idea it contains a table. It contains scraps of text at
 * coordinates. Reading a statement means putting those scraps back into rows
 * and columns — and doing it by position, not by guessing at the text, because
 * "SWIGGY 620.00 45,380.00" tells you nothing about which number is which.
 *
 * Input is a flat list of { text, x, y, width } with y increasing downwards.
 */

import { looksLikeHeader, readColumnRole } from './fields.js';

/** Scraps sharing a line become one row, left to right. */
export function groupIntoRows(items, tolerance = 3) {
  const usable = items
    .filter((item) => String(item.text).trim() !== '')
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const rows = [];

  for (const item of usable) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(item.y - row.y) <= tolerance) {
      row.items.push(item);
      // Keep the row's y as a running average so a slightly tall row does not
      // drift away from its own members.
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  for (const row of rows) row.items.sort((a, b) => a.x - b.x);

  return rows;
}

/** Where a scrap sits horizontally. */
function centreOf(item) {
  return item.x + (item.width || 0) / 2;
}

/**
 * Find the heading row and turn it into column definitions.
 *
 * Returns { rowIndex, columns: [{ role, heading, from, to }] } or null.
 */
export function findColumns(rows) {
  for (let index = 0; index < rows.length; index++) {
    const cells = rows[index].items.map((item) => item.text);
    if (!looksLikeHeader(cells)) continue;

    const headings = rows[index].items;

    const columns = headings.map((item, position) => {
      const previous = headings[position - 1];
      const next = headings[position + 1];

      // A column reaches halfway to each neighbour. The outermost columns run
      // to the edges, so nothing at the margins is lost.
      const from = previous
        ? (centreOf(previous) + centreOf(item)) / 2
        : -Infinity;
      const to = next
        ? (centreOf(item) + centreOf(next)) / 2
        : Infinity;

      return {
        role: readColumnRole(item.text),
        heading: String(item.text).trim(),
        from,
        to
      };
    });

    return { rowIndex: index, columns };
  }

  return null;
}

/** Drop each scrap of a row into the column it sits under. */
export function rowToCells(row, columns) {
  const cells = columns.map(() => []);

  for (const item of row.items) {
    const centre = centreOf(item);
    let target = columns.findIndex((column) => centre >= column.from && centre < column.to);
    if (target === -1) target = centre < columns[0].to ? 0 : columns.length - 1;
    cells[target].push(String(item.text).trim());
  }

  return cells.map((parts) => parts.join(' ').replace(/\s+/g, ' ').trim());
}

/**
 * Turn positioned text into a plain table of rows of cells, plus the roles of
 * each column. Everything above the heading row is returned separately, since
 * that is where account numbers and statement periods live.
 */
export function toTable(items) {
  const rows = groupIntoRows(items);
  const found = findColumns(rows);

  if (!found) {
    return {
      columns: null,
      rows: [],
      preamble: rows.map((row) => row.items.map((item) => item.text).join(' '))
    };
  }

  const body = rows
    .slice(found.rowIndex + 1)
    .map((row) => rowToCells(row, found.columns));

  const preamble = rows
    .slice(0, found.rowIndex)
    .map((row) => row.items.map((item) => item.text).join(' '));

  return { columns: found.columns, rows: body, preamble };
}
