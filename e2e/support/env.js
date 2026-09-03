'use strict';

/**
 * Where this suite's servers live, and which schema they sit on.
 *
 * Deliberately not 3000/5000 and not `deep_core`. The import tests write real
 * students, and a suite that could land on the ports and schema a person is
 * developing against would eventually write them into that person's database.
 *
 * The two ports may be overridden by the environment, and the reason is
 * Windows rather than preference: Hyper-V reserves blocks of ephemeral ports
 * and re-randomises them on every boot, so a machine can wake up with 5100
 * inside an excluded range. The symptom is not a port in use — nothing is
 * listening and `netstat` shows nothing — but `EACCES` on bind, which CRA
 * reports as *Something is already running on port 5100* and which sends
 * whoever reads it hunting for a process that does not exist.
 * `netsh interface ipv4 show excludedportrange protocol=tcp` is what says so.
 *
 * The defaults do not move: a suite whose ports drifted per machine would make
 * every "it works here" less informative. What the override buys is a run on a
 * machine that has temporarily lost a port, without a config change committed
 * for a condition that clears on the next reboot.
 */

/** A port from the environment, or the suite's own. */
const port = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const E2E_SCHEMA = 'deep_core_e2e';
const BACKEND_PORT = port('E2E_BACKEND_PORT', 3100);
const FRONTEND_PORT = port('E2E_FRONTEND_PORT', 5100);

module.exports = {
  E2E_SCHEMA,
  BACKEND_PORT,
  FRONTEND_PORT,
  BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
  FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
};
