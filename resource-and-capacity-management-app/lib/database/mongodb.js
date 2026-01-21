import { MongoClient, ServerApiVersion } from 'mongodb';
// Import MongoDB client and server API versioning

let client; // Cached MongoClient instance
let db;     // Cached database instance

// Connection URI (environment variable or fallback to local MongoDB)
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Database name (environment variable or default)
const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

/**
 * Connect to MongoDB
 * Ensures a single shared connection across the entire app.
 * @returns {Promise<Db>} Database instance
 */
export async function connectDB() {
  // If already connected, return existing DB instance
  if (db) {
    return db;
  }

  try {
    // Initialize MongoClient only once
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1, // Use stable API version
          strict: true,                 // Enforce strict mode
          deprecationErrors: true       // Warn on deprecated features
        }
      });
    }

    // Establish connection
    await client.connect();

    // Select the database
    db = client.db(dbName);

    // Ping the server to verify connection
    await db.command({ ping: 1 });
    console.log('Connected to MongoDB successfully');

    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

/**
 * Get database instance
 * Ensures connectDB() was called before accessing DB.
 * @returns {Db} Database instance
 */
export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

/**
 * Close database connection
 * Safely shuts down the MongoClient and clears cached instances.
 */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}