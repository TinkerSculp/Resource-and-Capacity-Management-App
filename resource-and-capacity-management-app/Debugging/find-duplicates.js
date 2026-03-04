/* =============================================================================
   find-duplicates.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script that scans the 'account' collection
     for duplicate values across three critical unique fields:
       • account.username  — must be unique per user
       • emp_id            — must be unique per employee
       • account.account_id — must be unique per account

     Useful after bulk data imports, seed operations, or migrations where
     duplicate records may have been accidentally introduced.

     Example usage:
       node debug/find-duplicates.js

   SECURITY MODEL:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be exposed as an API endpoint or run automatically
       in a production web process.
     • MONGODB_URI contains credentials — loaded from .env only, never
       hardcoded. Ensure .env is listed in .gitignore.
     • This script performs a full collection scan (find({}).toArray()).
       On large datasets this can be slow and memory-intensive — only run
       locally or in a safe non-production environment.
     • Output may reveal usernames and internal IDs — treat as sensitive
       and do not share or log publicly.
     • No writes are performed — this is a read-only diagnostic tool.

   WHEN TO USE:
     • After seeding or importing user data to verify integrity
     • Before deploying unique index changes to MongoDB
     • When debugging login failures caused by duplicate accounts

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
   • MONGODB_URI contains cluster address, username, and password.
     Treat as a secret — never log it or commit it to version control.
   • DB_NAME scopes all queries to the correct database, preventing
     accidental reads from other databases in the same cluster.
----------------------------------------------------------------------------- */
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

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
    // Throws if URI is malformed, credentials are wrong, or the
    // cluster is unreachable.
    await client.connect();

    // Scope all queries to the target database
    const db = client.db(dbName);

    // -----------------------------------------------------------------
    // FETCH ALL USERS
    // -----------------------------------------------------------------
    // Retrieves every document from the 'account' collection as an array.
    //
    // NOTE: find({}).toArray() loads all documents into memory at once.
    // This is acceptable for small datasets in a debug context, but on
    // large collections consider using a cursor with forEach() instead
    // to avoid memory pressure.
    const users = await db.collection('account').find({}).toArray();

    // -----------------------------------------------------------------
    // DUPLICATE TRACKING MAPS
    // -----------------------------------------------------------------
    // Three separate maps track which values have already been seen
    // as we iterate through the user documents. Using plain objects as
    // hash maps gives O(1) lookup per field, making the overall scan O(n).
    //
    // Fields checked:
    //   • username   — login identifier, must be globally unique
    //   • emp_id     — employee identifier, must be globally unique
    //   • account_id — account identifier, must be globally unique
    const seen = {
      username: {},
      emp_id: {},
      account_id: {}
    };

    console.log('\n🔍 Checking for duplicates...\n');

    // -----------------------------------------------------------------
    // DUPLICATE DETECTION LOOP
    // -----------------------------------------------------------------
    // Iterates through every user document and checks each unique field
    // against the seen maps. Logs a message on the first repeated value.
    //
    // SECURITY: Output reveals usernames and internal IDs — treat as
    // sensitive. Do not share terminal output publicly or in CI logs.
    users.forEach(u => {
      const { emp_id, account } = u;

      // Check for duplicate usernames
      if (seen.username[account.username]) {
        console.log(`⚠️  Duplicate username: ${account.username}`);
      }
      seen.username[account.username] = true; // Mark username as seen

      // Check for duplicate employee IDs
      if (seen.emp_id[emp_id]) {
        console.log(`⚠️  Duplicate emp_id: ${emp_id}`);
      }
      seen.emp_id[emp_id] = true; // Mark emp_id as seen

      // Check for duplicate account IDs
      if (seen.account_id[account.account_id]) {
        console.log(`⚠️  Duplicate account_id: ${account.account_id}`);
      }
      seen.account_id[account.account_id] = true; // Mark account_id as seen
    });

    console.log('\n✅ Duplicate check complete.\n');

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches connection failures, query errors, or unexpected exceptions.
    // Full error is logged — acceptable here since this is a local dev
    // tool and not a user-facing endpoint.
    console.error('Duplicate Check Error:', err);

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