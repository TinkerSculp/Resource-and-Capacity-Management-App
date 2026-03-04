/* =============================================================================
   find-user.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script that looks up and prints a full
     user document from the 'account' collection by username. Useful for
     inspecting account data during development, debugging login issues, or
     verifying that a seed or migration wrote the correct values.

     Example usage:
       node debug/find-user.js <username>

   ⚠️  CRITICAL SECURITY WARNINGS:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be exposed as an API endpoint or triggered automatically
       in any production process.
     • The full user document is printed to stdout via JSON.stringify — this
       output may include passwords, role IDs, and other sensitive fields.
       Never share terminal output from this script publicly or in CI logs.
     • MONGODB_URI contains credentials — loaded from .env only, never
       hardcoded. Ensure .env is listed in .gitignore.
     • The username argument is passed via CLI and used in a MongoDB equality
       query. No sanitisation is required as the MongoDB driver handles values
       as typed parameters — they are never interpolated into raw query strings.

   WHEN TO USE:
     • Inspecting a specific user's document during local development
     • Debugging login failures where the stored account data is suspect
     • Verifying a seed script or data migration wrote correct field values

   DEPENDENCIES:
     • dotenv   — Loads environment variables from the local .env file
     • mongodb  — Official MongoDB Node.js driver
   ============================================================================= */

// Load environment variables from .env into process.env
// Must be called before any process.env references below
require('dotenv').config();

// Official MongoDB Node.js driver
const { MongoClient } = require('mongodb');

/* -----------------------------------------------------------------------------
   ENVIRONMENT VARIABLES
   -----------------------------------------------------------------------------
   Both values loaded from .env — never hardcoded in source.

   SECURITY:
   • MONGODB_URI contains the cluster address, username, and password.
     Treat as a secret — never log it or commit it to version control.
   • DB_NAME scopes all queries to the correct database, preventing
     accidental reads from other databases in the same cluster.
----------------------------------------------------------------------------- */
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

/* -----------------------------------------------------------------------------
   CLI ARGUMENT PARSING
   -----------------------------------------------------------------------------
   Arguments are passed positionally:
     process.argv[0] = node executable path  (ignored)
     process.argv[1] = script file path      (ignored)
     process.argv[2] = username              (required)

   SECURITY:
   • The username value is used only in a MongoDB equality query.
     The MongoDB driver handles it as a typed value — not interpolated
     into a raw query string — so no additional sanitisation is needed.
----------------------------------------------------------------------------- */
const username = process.argv[2];

/* -----------------------------------------------------------------------------
   INPUT VALIDATION
   -----------------------------------------------------------------------------
   Exits early with a usage message if no username argument was provided.
   Prevents the script from querying with an undefined value, which would
   either return no results or behave unexpectedly.
----------------------------------------------------------------------------- */
if (!username) {
  console.log('Usage: node debug/find-user.js <username>');
  process.exit(1);
}

/* -----------------------------------------------------------------------------
   MAIN: Immediately Invoked Async Function
   -----------------------------------------------------------------------------
   Wrapped in an IIFE so we can use await at the top level while keeping
   CommonJS (require) syntax — no ES module conversion needed.
----------------------------------------------------------------------------- */
(async () => {

  // Create a new MongoClient instance — not yet connected
  const client = new MongoClient(uri);

  try {
    // -----------------------------------------------------------------
    // CONNECT
    // -----------------------------------------------------------------
    // Establishes the connection to the MongoDB cluster.
    // Throws if the URI is malformed, credentials are wrong, or the
    // cluster is unreachable.
    await client.connect();

    // Scope all queries to the target database
    const db = client.db(dbName);

    console.log(`\n🔍 Searching for username: ${username}`);

    // -----------------------------------------------------------------
    // USER LOOKUP
    // -----------------------------------------------------------------
    // Queries the 'account' collection for a single document where the
    // nested account.username field matches the provided CLI argument.
    // findOne() returns the first match or null if none is found.
    //
    // NOTE: The nested field path 'account.username' reflects the current
    // document schema — update this if the schema changes.
    const user = await db.collection('account').findOne({
      'account.username': username
    });

    // -----------------------------------------------------------------
    // OUTPUT
    // -----------------------------------------------------------------
    if (!user) {
      // No document found — username does not exist in the collection
      console.log('\n❌ No user found.');
    } else {
      // Document found — pretty-print the full object for inspection.
      //
      // ⚠️  SECURITY: The full document may contain passwords, role IDs,
      // and other sensitive fields. Do not share this output publicly
      // or paste it into tickets, Slack, or CI logs.
      console.log('\n✅ User found:');
      console.log(JSON.stringify(user, null, 2));
    }

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches connection failures, query errors, or unexpected exceptions.
    // Full error is logged — acceptable here since this is a local dev
    // tool and not a user-facing endpoint.
    console.error('Error:', err);

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: Always close the connection
    // -----------------------------------------------------------------
    // Ensures the MongoDB client is properly closed whether the script
    // succeeded or failed, preventing connection leaks and allowing
    // the Node.js process to exit cleanly.
    await client.close();
  }

})();