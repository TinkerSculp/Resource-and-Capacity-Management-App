/* =============================================================================
   check-db.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A lightweight diagnostic script for verifying MongoDB connectivity and
     inspecting database health. Intended to be run manually from the command
     line during development, deployment verification, or troubleshooting.

     Example usage:
       node check-db.js

   WHEN TO USE:
     • After initial deployment to confirm the database is reachable
     • After environment variable changes to verify the connection string works
     • During debugging to check collection counts and storage stats

   SECURITY MODEL:
     • The MongoDB connection string (MONGODB_URI) is loaded exclusively from
       environment variables — it is never hardcoded in this file.
     • This script must never be committed with real credentials. The .env file
       containing MONGODB_URI must be listed in .gitignore.
     • This is a developer/ops tool only — it must never be exposed as an API
       endpoint or run automatically in a production web process.
     • Database stats returned by db.stats() may reveal internal collection
       names and sizes — treat output as sensitive and do not log it publicly.
     • The MongoDB client is always closed in the finally block, preventing
       connection leaks even when errors occur.

   DEPENDENCIES:
     • dotenv    — Loads environment variables from the local .env file
     • mongodb   — Official MongoDB Node.js driver for connection + commands
   ============================================================================= */

// Load environment variables from .env into process.env
// Must be called before any process.env references below
require('dotenv').config();

// Official MongoDB Node.js driver — used for connecting and running commands
const { MongoClient } = require('mongodb');

/* -----------------------------------------------------------------------------
   ENVIRONMENT VARIABLES
   -----------------------------------------------------------------------------
   Both values are read from .env — never hardcoded.

   SECURITY:
   • MONGODB_URI contains credentials (username, password, cluster address).
     It must be treated as a secret and never logged or committed to source control.
   • DB_NAME scopes all operations to the correct database, preventing
     accidental reads or writes to other databases in the same cluster.
----------------------------------------------------------------------------- */
const uri = process.env.MONGODB_URI; // e.g. mongodb+srv://user:pass@cluster.mongodb.net
const dbName = process.env.DB_NAME;  // e.g. capstone_db

/* -----------------------------------------------------------------------------
   MAIN: Immediately Invoked Async Function
   -----------------------------------------------------------------------------
   Wrapped in an IIFE (Immediately Invoked Function Expression) so we can use
   await at the top level without requiring ES module syntax, keeping this
   script compatible with CommonJS (require/module.exports).
----------------------------------------------------------------------------- */
(async () => {

  // Create a new MongoClient instance using the connection string from .env
  // The client is not connected yet — connection happens on client.connect()
  const client = new MongoClient(uri);

  try {
    // -----------------------------------------------------------------
    // CONNECT
    // -----------------------------------------------------------------
    // Establishes a connection to the MongoDB cluster.
    // Throws if the URI is invalid, credentials are wrong, or the
    // cluster is unreachable — caught by the catch block below.
    await client.connect();

    // Scope all subsequent operations to the target database
    const db = client.db(dbName);

    console.log(`Connected to MongoDB: ${dbName}`);

    // -----------------------------------------------------------------
    // PING
    // -----------------------------------------------------------------
    // Sends a lightweight ping command to confirm the connection is
    // fully operational and the database is responding to commands.
    // A successful ping means authentication also passed.
    await db.command({ ping: 1 });
    console.log('Ping successful');

    // -----------------------------------------------------------------
    // DATABASE STATS
    // -----------------------------------------------------------------
    // Retrieves metadata about the database including:
    //   • Number of collections and objects
    //   • Storage size and index sizes
    //   • Average object size
    //
    // SECURITY: Output may reveal internal structure — treat as sensitive.
    // Do not log this in production environments or public CI pipelines.
    const stats = await db.stats();
    console.log('\nDatabase Stats:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (err) {
    // -----------------------------------------------------------------
    // ERROR HANDLING
    // -----------------------------------------------------------------
    // Catches and logs any failure during connection, ping, or stats.
    // Common causes: invalid URI, wrong credentials, network timeout,
    // IP not whitelisted in MongoDB Atlas network access settings.
    console.error('DB Check Error:', err);

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: Always close the connection
    // -----------------------------------------------------------------
    // Ensures the MongoDB client is closed regardless of success or
    // failure, preventing connection leaks and allowing the Node.js
    // process to exit cleanly.
    await client.close();
  }

})();