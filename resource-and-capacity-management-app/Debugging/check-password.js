/* =============================================================================
   check-password.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script for verifying that a given
     username and password exist in the database. Used during development
     and debugging to quickly confirm account credentials without going
     through the full login flow.

     Example usage:
       node debug/check-password.js <username> <password>

   ⚠️  CRITICAL SECURITY WARNINGS:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be run in production or exposed as any kind of endpoint.
     • Passwords are compared in PLAINTEXT here. This is only acceptable
       because this is a debug tool — production login must use bcrypt or
       an equivalent hashing library to compare passwords securely.
     • CLI arguments (including passwords) may be visible in shell history
       and process listings (e.g. ps aux). Use with caution even locally.
     • This file must be listed in .gitignore or kept out of version control
       if it is ever run against real user data.
     • MONGODB_URI contains credentials — never hardcode it. Always load
       from .env and ensure .env is in .gitignore.

   WHEN TO USE:
     • Confirming a seeded user's credentials during local development
     • Debugging login failures when the auth endpoint isn't helpful
     • Verifying that a password reset wrote the correct value to the DB

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
   Loaded from .env — never hardcoded in source.

   SECURITY:
   • MONGODB_URI contains the cluster address, username, and password.
     Treat it as a secret — never log it or commit it to version control.
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
     process.argv[3] = password              (required)

   SECURITY:
   • Passwords passed as CLI arguments may appear in shell history and
     system process listings. Acceptable for local debug use only.
   • No sanitisation is needed here as these values are only used in a
     MongoDB equality query — they are never interpolated into raw queries
     and the MongoDB driver handles them safely as typed values.
----------------------------------------------------------------------------- */
const username = process.argv[2];
const password = process.argv[3];

/* -----------------------------------------------------------------------------
   INPUT VALIDATION
   -----------------------------------------------------------------------------
   Exits early with a usage message if either argument is missing.
   Prevents the script from running in a broken state and producing
   misleading output (e.g. matching against undefined).
----------------------------------------------------------------------------- */
if (!username || !password) {
  console.log('Usage: node debug/check-password.js <username> <password>');
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

    // -----------------------------------------------------------------
    // USER LOOKUP
    // -----------------------------------------------------------------
    // Queries the 'account' collection for a document where the nested
    // account.username field matches the provided CLI argument.
    //
    // NOTE: The nested field path 'account.username' reflects the
    // document schema — adjust if the schema changes.
    const user = await db.collection('account').findOne({
      'account.username': username
    });

    // No document found with that username — exit early
    if (!user) {
      console.log('\n❌ Username not found.');
      return;
    }

    // -----------------------------------------------------------------
    // PASSWORD COMPARISON
    // -----------------------------------------------------------------
    // ⚠️  PLAINTEXT COMPARISON — DEBUG ONLY.
    // This directly compares the stored password string with the
    // provided argument. This is intentionally simple for a debug tool.
    //
    // PRODUCTION REQUIREMENT: The live login endpoint must use bcrypt
    // (or equivalent) to compare a plaintext input against a stored
    // hash — never store or compare passwords in plaintext in production.
    if (user.account.password === password) {
      console.log('\n✅ Password matches.');
    } else {
      console.log('\n❌ Incorrect password.');
    }

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches connection failures, query errors, or unexpected exceptions.
    // Logs the full error for debugging — acceptable here since this is
    // a local dev tool and not a user-facing endpoint.
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