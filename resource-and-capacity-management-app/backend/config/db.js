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
     getDB() or getCollection() which throw immediately if called before
     connectDB() succeeds, preventing silent failures.

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
     • connectDB()        — Establish (or reuse) the MongoDB connection
     • getDB()            — Return the active db instance
     • getCollection(name) — Return a specific collection by name
     • closeDB()          — Gracefully close the connection

   DEPENDENCIES:
     • mongodb — Official MongoDB Node.js driver
   ============================================================================= */

import { MongoClient, ServerApiVersion } from "mongodb";

/* -----------------------------------------------------------------------------
   MODULE-LEVEL SINGLETONS
   -----------------------------------------------------------------------------
   These variables persist for the lifetime of the Node.js process.
   Once initialised by connectDB(), they are reused by all subsequent calls
   to getDB() and getCollection() without reopening the connection.
----------------------------------------------------------------------------- */
let client; // The MongoClient instance — created once and reused
let db;     // The target database instance — scoped to DB_NAME

/* -----------------------------------------------------------------------------
   ENVIRONMENT VARIABLES
   -----------------------------------------------------------------------------
   SECURITY:
   • MONGODB_URI contains the cluster address, credentials, and options.
     Treat as a secret — never log the full URI or commit it to source control.
   • Falls back to localhost only for local development convenience.
     In production, MONGODB_URI must always be set explicitly.
   • DB_NAME defaults to the app database name if not set in the environment.
----------------------------------------------------------------------------- */
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "ResourceManagementAPP_DB";

/* -----------------------------------------------------------------------------
   LOGGING TOGGLE
   -----------------------------------------------------------------------------
   Set LOG_DB=true in .env to enable verbose connection logging during
   development. In production, leave this unset to keep logs clean and avoid
   exposing internal connection details.
----------------------------------------------------------------------------- */
const LOG_DB = process.env.LOG_DB === "true";

/* -----------------------------------------------------------------------------
   MISSING URI WARNING
   -----------------------------------------------------------------------------
   Warns immediately at module load time if MONGODB_URI is not set, so
   developers are aware they are using the localhost fallback rather than
   the real database. This prevents confusion during local development.
----------------------------------------------------------------------------- */
if (!process.env.MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI not set. Using local MongoDB instance.");
}

/* -----------------------------------------------------------------------------
   FUNCTION: connectDB
   -----------------------------------------------------------------------------
   Establishes a connection to MongoDB and stores the db instance as a
   module-level singleton. Safe to call multiple times — returns the existing
   connection immediately if one is already open.

   RETURN: {Db} — The active MongoDB database instance.
   THROWS:       — Re-throws any connection error after logging, so the caller
                   (server.js) can handle it and exit the process cleanly.

   SECURITY:
   • A ping command verifies the connection is fully operational before
     returning — prevents the server from starting with a half-open connection.
   • Errors are re-thrown so server.js can call process.exit(1) on failure,
     preventing the app from running in a broken state.
----------------------------------------------------------------------------- */
export async function connectDB() {
  // Return existing connection immediately — no new client needed
  if (db) {
    if (LOG_DB) console.log("Using existing MongoDB connection");
    return db;
  }

  try {
    // Create a new MongoClient only if one doesn't already exist
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1, // Pin to stable Server API v1
          strict: false,                // Allow non-stable commands (e.g. ping)
          deprecationErrors: true       // Throw on deprecated API usage — catches issues early
        }
      });
    }

    // Establish the physical connection to the MongoDB cluster
    await client.connect();

    // Scope all operations to the target database
    db = client.db(dbName);

    // Verify the connection is fully operational with a lightweight ping
    await db.command({ ping: 1 });

    console.log(`✅ Connected to MongoDB → ${dbName}`);
    return db;

  } catch (error) {
    // Log the error then re-throw so server.js can exit cleanly
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: getDB
   -----------------------------------------------------------------------------
   Returns the active database instance. Must only be called after connectDB()
   has successfully completed — throws immediately if called before that to
   prevent silent failures in route handlers.

   RETURN: {Db} — The active MongoDB database instance.
   THROWS:       — If connectDB() has not been called yet.
----------------------------------------------------------------------------- */
export function getDB() {
  if (!db) {
    // Throw with a descriptive message so the developer knows exactly what to fix
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}

/* -----------------------------------------------------------------------------
   FUNCTION: getCollection
   -----------------------------------------------------------------------------
   Returns a specific MongoDB collection by name. Provides a convenient
   shorthand so route handlers don't need to call getDB().collection() directly.
   Throws immediately if the database is not yet initialised.

   PARAM:  name {string} — The name of the collection to retrieve.
   RETURN: {Collection}  — The MongoDB collection instance.
   THROWS:               — If connectDB() has not been called yet.
----------------------------------------------------------------------------- */
export function getCollection(name) {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  // Return the collection — MongoDB creates it lazily if it doesn't exist
  return db.collection(name);
}

/* -----------------------------------------------------------------------------
   FUNCTION: closeDB
   -----------------------------------------------------------------------------
   Gracefully closes the MongoDB client connection and resets the singleton
   variables. Typically called during graceful server shutdown or in test
   teardown to prevent connection leaks.

   NOTE: In normal production operation this is rarely called directly —
   Railway and Node.js handle process cleanup. It is most useful in test
   environments where connections must be explicitly closed between test runs.
----------------------------------------------------------------------------- */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null; // Reset singleton so a fresh connection can be made if needed
    db = null;
    console.log("🔒 MongoDB connection closed");
  }
}