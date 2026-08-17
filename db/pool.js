'use strict';

const path = require('node:path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `${name} is not set. Copy .env.example to .env at the repository root and fill it in.`,
    );
  }
  return value;
}

/**
 * A schema name, checked before it is spliced into SQL.
 *
 * Schema names cannot be sent as query parameters, so every place that names
 * one builds a string. Nothing user-facing reaches these call sites today, but
 * one validator shared by all of them is cheaper than auditing each one later,
 * and it turns an unset DB_SCHEMA into an error instead of a schema literally
 * called "undefined".
 */
function schemaName(value, source = 'DB_SCHEMA') {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value) || value.length > 63) {
    throw new Error(
      `${source} is not a usable schema name (got ${JSON.stringify(value)}). ` +
        'Copy .env.example to .env at the repository root and fill it in.',
    );
  }
  return value;
}

/**
 * A connection pool for the DEEP-Core database.
 *
 * The schema is set on the connection itself, via libpq's `options`, rather
 * than issued as a `SET` after connecting: `options` applies to every
 * connection the pool opens, whereas a `SET` on one checked-out client says
 * nothing about the next one. Queries therefore name bare tables and the
 * schema is a configuration value - which is how the test harness points at
 * its own schema without touching a line of SQL.
 *
 * `public` stays on the path so extensions and built-in types installed there
 * keep resolving.
 */
function createPool({ schema } = {}) {
  const target = schemaName(schema ?? required('DB_SCHEMA'));

  return new Pool({
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    user: required('DB_USER'),
    password: required('DB_PASS'),
    database: required('DB_NAME'),
    options: `-c search_path=${target},public`,
  });
}

module.exports = { createPool, schemaName };
