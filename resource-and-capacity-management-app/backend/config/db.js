/* =============================================================================
   db.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Manages the MongoDB client connection and exposes helper functions for
     accessing the database and its collections throughout the application.
     Implements a singleton pattern so only one MongoClient instance is ever
     created, regardless of how many times connectDB() is called.

   SINGLETON PATTERN:
     The client and db variables are module-level singletons. Once connectDB()
     successfully connects, subsequent calls return the existing db instance
     immediately without opening a new connection. This is critical for
     performance — opening a new MongoClient on every request would be
     extremely slow and exhaust connection pool limits.

   STARTUP REQUIREMENT:
     connectDB() must be called once at server startup (in server.js) before
     any route handler runs. All route handlers access the database via
     getDB() or getCollection(), which throw immediately if called before
     connectDB() succeeds — preventing silent failures.

   SECURITY MODEL:
     • MONGODB_URI is loaded from environment variables only — never hardcoded.
       It contains credentials and must be in .gitignore and never committed.
     • Falls back to a local MongoDB instance if MONGODB_URI is not set,
       with a console warning so developers are aware of the fallback.
     • ServerApiVersion.v1 with deprecationErrors: true ensures the app uses
       a stable, well-defined MongoDB API and fails loudly if deprecated
       features are accidentally used.
     • A ping command is issued after connecting to verify the connection is
       fully operational before the server starts accepting requests.
     • Connection errors are re-thrown after logging so server.js can catch
       them and exit with process.exit(1) — preventing a running server with
       no database from silently serving broken responses.
     • LOG_DB environment variable gates verbose connection logging so
       internal connection details are not exposed in production logs.

   EXPORTED FUNCTIONS:
     • connectDB()         — Establish (or reuse) the MongoDB connection
     • getDB()             — Return the active db instance
     • getCollection(name) — Return a specific collection by name
     • closeDB()           — Gracefully close the connection

   DEPENDENCIES:
     • mongodb — Official MongoDB Node.js driver
   ============================================================================= */

import { MongoClient, ServerApiVersion } from "mongodb";

/* =============================================================================
   MODULE-LEVEL SINGLETONS
   -----------------------------------------------------------------------------
   These variables persist for the lifetime of the Node.js process.
   Once initialised by connectDB(), they are reused by all subsequent calls
   to getDB() and getCollection() — no new connection is opened on each request.
   Setting them to undefined initially makes it easy to check if a connection
   has been established yet (falsy check).
   ============================================================================= */
let client; // The MongoClient instance — created once, reused everywhere
let db;     // The scoped database instance — tied to DB_NAME

/* =============================================================================
   ENVIRONMENT CONFIGURATION
   -----------------------------------------------------------------------------
   MONGODB_URI: Full connection string including cluster address, credentials,
     and options. Must be set in .env for production. Treat as a secret —
     never log the full URI or commit it to source control.

   DB_NAME: The target database within the MongoDB cluster. Defaults to the
     app's database name if not overridden in the environment.

   LOG_DB: Set to "true" in .env during development to enable verbose
     connection logging. Leave unset in production to keep logs clean.
   ============================================================================= */
const uri    = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME     || "ResourceManagementAPP_DB";
const LOG_DB = process.env.LOG_DB === "true";

/* -----------------------------------------------------------------------------
   MISSING URI WARNING
   Fires at module load time — immediately visible in the console if a developer
   forgets to set MONGODB_URI. Prevents confusion about which database is
   being used during local development.
----------------------------------------------------------------------------- */
if (!process.env.MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI not set. Falling back to local MongoDB instance.");
}

/* =============================================================================
   FUNCTION: connectDB
   -----------------------------------------------------------------------------
   Establishes a connection to MongoDB and stores the result as a module-level
   singleton. Safe to call multiple times — returns the existing db instance
   immediately if a connection is already open, avoiding redundant connections.

   Called once at server startup in server.js. All route handlers then access
   the database through getDB() or getCollection() without needing to connect
   themselves.

   RETURNS: {Db}  — The active MongoDB database instance scoped to DB_NAME.
   THROWS:        — Re-throws any connection error after logging, so server.js
                    can catch it and call process.exit(1) to prevent the server
                    from running in a broken state.
   ============================================================================= */
export async function connectDB() {
  // Already connected — return the existing instance immediately
  if (db) {
    if (LOG_DB) console.log("♻️  Reusing existing MongoDB connection");
    return db;
  }

  try {
    // Create the MongoClient only once — reused for all subsequent requests
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1, // Pin to stable Server API v1 for consistency
          strict: false,                // Allow non-stable commands such as ping
          deprecationErrors: true,      // Throw on deprecated API usage — catches issues early
        },
      });
    }

    // Open the physical connection to the MongoDB cluster
    await client.connect();

    // Scope all database operations to the target database
    db = client.db(dbName);

    // Verify the connection is fully operational with a lightweight round-trip ping
    await db.command({ ping: 1 });

    console.log(`✅ Connected to MongoDB → ${dbName}`);
    return db;

  } catch (error) {
    // Log the full error for diagnostics, then re-throw so server.js can exit cleanly
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

/* =============================================================================
   FUNCTION: getDB
   -----------------------------------------------------------------------------
   Returns the active database instance for direct use in route handlers or
   controllers. Must only be called after connectDB() has completed — throws
   with a descriptive message if called too early so the developer knows
   exactly what went wrong.

   RETURNS: {Db}  — The active MongoDB database instance.
   THROWS:        — If connectDB() has not been called yet.
   ============================================================================= */
export function getDB() {
  if (!db) {
    // Descriptive error so the developer knows to call connectDB() at startup
    throw new Error("Database not initialised. Call connectDB() before making requests.");
  }
  return db;
}

/* =============================================================================
   FUNCTION: getCollection
   -----------------------------------------------------------------------------
   Convenience wrapper that returns a specific MongoDB collection by name.
   Saves route handlers from having to call getDB().collection() directly,
   keeping collection access consistent across the codebase.

   MongoDB creates collections lazily — if the named collection does not exist
   yet, it will be created automatically on the first write operation.

   PARAM:   name {string}   — The name of the collection to retrieve.
   RETURNS: {Collection}    — The MongoDB collection instance.
   THROWS:                  — If connectDB() has not been called yet.
   ============================================================================= */
export function getCollection(name) {
  if (!db) {
    throw new Error("Database not initialised. Call connectDB() before accessing collections.");
  }
  // MongoDB lazily creates the collection on first write if it does not exist
  return db.collection(name);
}

/* =============================================================================
   FUNCTION: closeDB
   -----------------------------------------------------------------------------
   Gracefully closes the MongoClient connection and resets the singleton
   variables so a fresh connection can be established if needed. Primarily
   used during graceful server shutdown or in test teardown to prevent
   connection leaks between test runs.

   In normal production operation this is rarely called directly — Railway
   and the Node.js process lifecycle handle cleanup automatically.
   ============================================================================= */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null; // Reset so connectDB() can open a fresh connection if called again
    db     = null;
    console.log("🔒 MongoDB connection closed.");
  }
}