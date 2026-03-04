/* =============================================================================
   validate-account-structure.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script that scans every document in the
     'account' collection and validates that all required fields are present.
     Reports any documents with missing or malformed fields so they can be
     fixed before causing runtime errors in the application.

     Example usage:
       node debug/validate-account-structure.js

   FIELDS VALIDATED:
     Top-level:
       • emp_id          — Employee identifier, required for all API scoping

     Nested (account object):
       • username        — Login identifier
       • password        — Stored credential (should be hashed in production)
       • acc_type_id     — Role identifier (1 = Manager, 2 = Member, 3 = Stakeholder)
       • account_id      — Unique account identifier

   ⚠️  SECURITY WARNINGS:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be exposed as an API endpoint or run automatically
       in any production process.
     • Output may reveal which users have missing passwords or account IDs —
       treat as sensitive. Do not share publicly, paste into CI logs,
       tickets, or Slack.
     • MONGODB_URI contains credentials — loaded from .env only, never
       hardcoded. Ensure .env is listed in .gitignore.
     • find({}).toArray() loads all documents into memory at once.
       Acceptable for small local datasets — not suitable for large
       production collections.
     • No writes are performed — this is a read-only diagnostic tool.

   WHEN TO USE:
     • After seeding to confirm all required fields were written correctly
     • After a migration to catch any documents with incomplete structure
     • When debugging login or permission failures caused by missing fields

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
    const users = await db.collection('account').find({}).toArray();

    console.log('\n🔍 Validating account structure...\n');

    // Track total number of invalid documents found
    let invalidCount = 0;

    // -----------------------------------------------------------------
    // VALIDATION LOOP
    // -----------------------------------------------------------------
    // Iterates through every user document and checks for the presence
    // of all required fields. Issues are collected into an array per
    // document so all problems are reported at once rather than stopping
    // at the first missing field.
    //
    // SECURITY: Output may reveal missing passwords or account IDs —
    // treat as sensitive and do not share publicly.
    users.forEach((u, i) => {
      // Collect all issues found for this document before printing
      const issues = [];

      // -----------------------------------------------------------------
      // TOP-LEVEL FIELD CHECKS
      // -----------------------------------------------------------------
      // emp_id is required at the top level of every account document.
      // It is used throughout the API to scope queries to the correct employee.
      if (!u.emp_id) issues.push('Missing emp_id');

      // The entire nested account object must exist before checking its fields
      if (!u.account) {
        issues.push('Missing account object');
      } else {
        // -----------------------------------------------------------------
        // NESTED ACCOUNT FIELD CHECKS
        // -----------------------------------------------------------------
        // These fields are required for login, role enforcement, and
        // account identification throughout the application.

        // username — required for login lookup
        if (!u.account.username) issues.push('Missing username');

        // password — required for authentication
        // ⚠️  Should be a bcrypt hash in production, not plaintext
        if (!u.account.password) issues.push('Missing password');

        // acc_type_id — required for role-based access control
        // Maps to ROLES constants: 1 = Manager, 2 = Member, 3 = Stakeholder
        if (!u.account.acc_type_id) issues.push('Missing acc_type_id');

        // account_id — required as the unique account identifier
        if (!u.account.account_id) issues.push('Missing account_id');
      }

      // Report all issues found for this document
      if (issues.length > 0) {
        invalidCount++;
        console.log(`  ⚠️  User ${i + 1} has issues:`, issues);
      }
    });

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    // Print a final summary so it is immediately clear whether any
    // action needs to be taken after running the script.
    if (invalidCount === 0) {
      console.log(`✅ All ${users.length} account(s) are valid.\n`);
    } else {
      console.log(`\n❌ ${invalidCount} of ${users.length} account(s) have issues. Review output above.\n`);
    }

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches connection failures, query errors, or unexpected exceptions.
    // Full error is logged — acceptable here since this is a local dev
    // tool and not a user-facing endpoint.
    console.error('Validation Error:', err);

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