/* =============================================================================
   list-collections.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A developer-only CLI diagnostic script that lists all collections in the
     target MongoDB database along with their document counts. Useful for
     quickly verifying database structure after seeding, migrations, or
     initial deployment.

     Example usage:
       node debug/list-collections.js

   SECURITY MODEL:
     • THIS SCRIPT IS FOR LOCAL DEVELOPMENT AND DEBUGGING ONLY.
       It must never be exposed as an API endpoint or run automatically
       in any production process.
     • MONGODB_URI contains credentials — loaded from .env only, never
       hardcoded. Ensure .env is listed in .gitignore.
     • Output reveals internal collection names and document counts —
       treat as sensitive structural information. Do not share publicly
       or paste into CI logs, tickets, or Slack.
     • No writes are performed — this is a read-only diagnostic tool.
     • listCollections() and countDocuments() are scoped to the single
       database specified by DB_NAME — no other databases are touched.

   WHEN TO USE:
     • After running a seed script to confirm all collections were created
     • After a migration to verify document counts are as expected
     • During initial setup to confirm the database is structured correctly

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

    console.log(`\n✅ Connected to MongoDB: ${dbName}`);

    // -----------------------------------------------------------------
    // LIST COLLECTIONS
    // -----------------------------------------------------------------
    // Retrieves metadata for all collections in the target database
    // as an array. Each item contains at minimum a 'name' field.
    //
    // SECURITY: Collection names reveal the internal structure of the
    // database. Treat this output as sensitive — do not share publicly.
    const collections = await db.listCollections().toArray();

    console.log('\n📋 Collections:\n');

    // -----------------------------------------------------------------
    // DOCUMENT COUNT PER COLLECTION
    // -----------------------------------------------------------------
    // Iterates through each collection and issues a countDocuments()
    // call to get the number of documents currently stored.
    //
    // NOTE: countDocuments() issues one query per collection. On a
    // database with many large collections this may be slow — acceptable
    // for a local debug tool but not suitable for production monitoring.
    for (const col of collections) {
      // Count documents in this collection — returns an integer
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name} (${count} docs)`);
    }

    console.log('\n✅ Collection listing complete.\n');

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches connection failures, query errors, or unexpected exceptions.
    // Full error is logged — acceptable here since this is a local dev
    // tool and not a user-facing endpoint.
    console.error('List Collections Error:', err);

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