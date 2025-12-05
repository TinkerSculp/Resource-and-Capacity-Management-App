const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let db;

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

/**
 * Connect to MongoDB
 * @returns {Promise<Db>} Database instance
 */
async function connectDB() {
  if (db) {
    return db;
  }

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
    }

    await client.connect();
    db = client.db(dbName);
    
    // Test connection
    await db.command({ ping: 1 });
    console.log('Connected to MongoDB successfully');
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Db} Database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

/**
 * Close database connection
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
