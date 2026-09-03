'use strict';

/**
 * The application, built and returned rather than started.
 *
 * The inherited index.js built the app and called listen() in the same file,
 * which is why nothing in it could ever be tested: importing it bound a port.
 * Splitting the two is the only structural change docs/06 asks for, and it is
 * what lets the whole test suite run in-process, with no port and no fixed
 * order between test files.
 *
 * The pool is a parameter, not something this module creates. That is what
 * makes pointing the application at a test schema a matter of handing it a
 * different pool - no environment variable mutated at test time, and no code
 * path that only tests take.
 *
 * CORS arrives with #10, which is the first ticket with a browser in front of
 * the API. One origin is allowed - the frontend's, named by FRONTEND_URL -
 * and credentials are enabled, because the session is a cookie and a
 * cross-origin request without them arrives anonymous. A wildcard origin is
 * not an option even if it were wanted: the two settings are mutually
 * exclusive by specification.
 *
 * The static evidence directory this header once said was coming never
 * arrived, and #35 is the reason. That ticket serves evidence from disk, and
 * it does it through a route that reads the row, decides whether this caller
 * may open this file, and only then reads the bytes — because the delivered
 * system's `express.static('/data/evidence')` was one of the two security
 * defects the ticket exists to fix. There is no static mount here and there
 * should not be one; #47's profile photos will want the same argument made
 * again rather than a directory opened for them.
 *
 * There is no express-session either, and there will not be one: #8's session
 * is a signed JWT in an HttpOnly cookie, which needs a cookie parser and no
 * store. Passport is mounted by the auth router rather than here, because the
 * Google strategy is the only thing that uses it and it is registered only
 * when the OAuth credentials are configured.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { attachRoles } = require('./auth/authorise');
const { REFUSALS } = require('./auth/refusals');
const { frontendUrl } = require('./config');
const { requireSession } = require('./auth/session');
const { departmentRoutes } = require('./routes/departments');
const { historyRoutes } = require('./routes/history');
const { authRoutes } = require('./routes/auth');
const { grantRoutes } = require('./routes/grants');
const { healthRoutes } = require('./routes/health');
const { meRoutes } = require('./routes/me');
const { offeringRoutes } = require('./routes/offerings');
const { teachingRoutes } = require('./routes/teaching');
const { cloRoutes } = require('./routes/clos');
const { behaviorRoutes } = require('./routes/behaviors');
const { achievementRoutes } = require('./routes/achievementCriteria');
const { weightRoutes } = require('./routes/weights');
const { teachingPlanRoutes } = require('./routes/teachingPlan');
const { activityRoutes } = require('./routes/activities');
const { activityScoreRoutes } = require('./routes/activityScores');
const { learningDetailRoutes } = require('./routes/learningDetails');
const { enrolmentRoutes } = require('./routes/enrolment');
const { evidenceRoutes } = require('./routes/evidence');
const { workGroupRoutes } = require('./routes/workGroups');
const { ploRoutes } = require('./routes/plos');
const { ploMappingRoutes } = require('./routes/ploMapping');
const { programResultRoutes } = require('./routes/programResults');
const { programRoutes } = require('./routes/programs');
const { rubricRoutes } = require('./routes/rubrics');
const { rubricCriteriaRoutes } = require('./routes/rubricCriteria');
const { programSubjectRoutes } = require('./routes/programSubjects');
const { subjectRoutes } = require('./routes/subjects');
const { studentRoutes } = require('./routes/students');
const { userRoutes } = require('./routes/users');

function createApp({ pool }) {
  if (!pool) throw new Error('createApp needs a pool');

  const app = express();

  app.use(cors({ origin: frontendUrl(), credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // The import file, posted as its own text rather than as a multipart upload:
  // a file input can read its file and send the characters, which is the whole
  // of what multipart would have bought here, and this way nothing is written
  // to disk and there is nothing to clean up after a request that failed. See
  // lib/importer.js, which every import screen shares. The limit is a few
  // thousand rows' worth.
  app.use(express.text({ type: 'text/csv', limit: '2mb' }));
  app.use(cookieParser());

  // Everything mounted above this line answers an anonymous caller; everything
  // below it does not. Health is the one endpoint that has to answer before
  // anyone has signed in - a load balancer holds no cookie - and sign-in
  // cannot require having signed in. That is the whole of the public surface,
  // and #9's sixth criterion is true of every route added after this line by
  // construction rather than by anyone remembering to guard it.
  app.use('/api', healthRoutes(pool));
  app.use('/api', authRoutes(pool));

  app.use('/api', requireSession, attachRoles(pool));

  app.use('/api', meRoutes(pool));
  // Before the user routes: #12's `/users/grantable` would otherwise be read
  // as an account identifier by `/users/:userId` and answered 404.
  app.use('/api', grantRoutes(pool));
  app.use('/api', historyRoutes(pool));
  app.use('/api', userRoutes(pool));
  app.use('/api', departmentRoutes(pool));
  app.use('/api', programRoutes(pool));
  app.use('/api', subjectRoutes(pool));
  app.use('/api', programSubjectRoutes(pool));
  app.use('/api', studentRoutes(pool));
  app.use('/api', offeringRoutes(pool));
  app.use('/api', teachingRoutes(pool));
  app.use('/api', cloRoutes(pool));
  app.use('/api', behaviorRoutes(pool));
  app.use('/api', achievementRoutes(pool));
  app.use('/api', weightRoutes(pool));
  app.use('/api', teachingPlanRoutes(pool));
  app.use('/api', activityRoutes(pool));
  app.use('/api', activityScoreRoutes(pool));
  app.use('/api', learningDetailRoutes(pool));
  app.use('/api', enrolmentRoutes(pool));
  app.use('/api', evidenceRoutes(pool));
  app.use('/api', workGroupRoutes(pool));
  app.use('/api', ploRoutes(pool));
  app.use('/api', ploMappingRoutes(pool));
  app.use('/api', programResultRoutes(pool));
  app.use('/api', rubricRoutes(pool));
  app.use('/api', rubricCriteriaRoutes(pool));

  // Express' own fallback answers with HTML, which a client that asked for
  // JSON cannot read: it gets a parse error where it expected a status.
  //
  // `message`, like every other refusal in the system, and not `error` as this
  // answered until #95. The client reads `message` and nothing else, so the
  // old field made this the one refusal whose words never reached the screen:
  // the screen fell through to its own guess, and the guess was that the
  // connection had failed. It had not - a body arriving is proof it had not.
  // The sentence it now sends is the one that gets a person to restart a
  // backend started before the route they are calling was written, which is
  // the way this is met in practice while the screens are being built.
  //
  // `error` is dropped rather than kept alongside: nothing reads it. It was
  // asserted in two tests and consumed nowhere, and a field held for
  // compatibility with no consumer is a field the next reader has to check.
  app.use((request, response) => {
    response.status(404).json({ message: REFUSALS.routeNotFound });
  });

  // The last thing mounted, because that is the only position Express treats
  // as an error handler, and the four-argument shape is the only signature it
  // recognises as one - `next` is unused and cannot be dropped.
  //
  // Without it, Express' own finalhandler answers a thrown error with the
  // stack trace in the body whenever NODE_ENV is not 'production', which is
  // the default everywhere except a deployment that remembered to set it.
  // That publishes absolute server paths and module names to whoever provoked
  // the throw. The stack goes to the log, where it is useful, and the caller
  // gets a status and a sentence.
  // eslint-disable-next-line no-unused-vars
  app.use((error, request, response, next) => {
    console.error(error);
    response.status(500).json({ message: REFUSALS.unexpected });
  });

  return app;
}

module.exports = { createApp };
