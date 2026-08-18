'use strict';

/**
 * Which page of a list was asked for, and how many rows on it.
 *
 * Ten rows is the number the tickets name - #11's first criterion, #13's third,
 * #14's fourth - so it is the default everywhere and is written once here
 * rather than in each route that pages. The ceiling is what stops `per_page` on
 * a query string from being a way to ask the server for the whole table in one
 * request.
 *
 * Anything unreadable falls back to the default rather than refusing. A page
 * number is navigation, not data: a client that sends `page=abc` gets the first
 * page, which is what the person in front of it wanted, and nothing is written
 * either way.
 */

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const pageOf = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(req.query.per_page, 10) || PAGE_SIZE),
  );
  return { page, perPage, offset: (page - 1) * perPage };
};

module.exports = { PAGE_SIZE, MAX_PAGE_SIZE, pageOf };
