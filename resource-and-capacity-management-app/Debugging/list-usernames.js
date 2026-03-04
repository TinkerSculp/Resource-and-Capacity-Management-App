/* =============================================================================
   list-usernames.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script that prints a summary list of all
     user accounts in the 'account' collection, showing each user's username
     and account type ID. Useful for quickly verifying which accounts exist
     after seeding, migrations, or manual data entry.

     Example usage:
       node debug/list-usernames.js

   ⚠️  SECURITY WARNINGS:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be exposed as an API endpoint or run automatically
       in any production process.
     • Output reveals all usernames and account type IDs in the database —
       treat as sensitive. Do not share publicly, paste into CI logs,
       tickets, or Slack.
     • MONGODB_URI contains credentials — loaded from .env only, never
       hardcoded. Ensure .env is listed in .gitignore.
     • find({}).toArray() loads all user documents into memory at once.
       Acceptable for small datasets locally — not suitable for large
       production collections.
     • No writes are performed — this is a read-only diagnostic tool.

   WHEN TO USE:
     • After seeding to confirm all user accounts were created correctly
     • To quickly check which account types are assigned to which users
     • When debugging role or permission issues tied to acc_type_id

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
    // FETCH ALL USERS
    // -----------------------------------------------------------------
    // Retrieves every document from the 'account' collection as an array.
    //
    // NOTE: find({}).toArray() loads all documents into memory at once.
    // Acceptable for small local datasets — for large collections consider
    // using a cursor with forEach() to avoid memory pressure.
    //
    // SECURITY: Results include usernames and account type IDs — treat
    // output as sensitive and do not share publicly.
    const users = await db.collection('account').find({}).toArray();

    console.log('\n📋 User Accounts');
    console.log('================\n');

    // -----------------------------------------------------------------
    // PRINT USER SUMMARY
    // -----------------------------------------------------------------
    // Iterates through each user document and prints a one-line summary
    // showing the index, username, and account type ID (acc_type_id).
    //
    // acc_type_id maps to the ROLES constants defined in /lib/roles.js:
    //   1 = Resource Manager
    //   2 = Team Member
    //   3 = Stakeholder
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.account.username}  (type: ${u.account.acc_type_id})`);
    });

    console.log(`\n✅ ${users.length} user(s) listed.\n`);

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