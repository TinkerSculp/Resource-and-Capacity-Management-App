// Load environment variables from .env file
require('dotenv').config();

// Import MongoDB client
const { MongoClient } = require('mongodb');

// Read connection string + database name from environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Immediately invoked async function for clean script execution
(async () => {
  // Create a new MongoDB client instance
  const client = new MongoClient(uri);

  try {
    // Establish connection to MongoDB
    await client.connect();
    const db = client.db(dbName);

    console.log(`Connected to MongoDB: ${dbName}`);

    // Send a ping command to verify the connection is alive
    await db.command({ ping: 1 });
    console.log('Ping successful');

    // Retrieve database statistics (collections, objects, storage size, etc.)
    const stats = await db.stats();
    console.log('\nDatabase Stats:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (err) {
    // Log any connection or command errors
    console.error('DB Check Error:', err);
  } finally {
    // Always close the client connection, even if an error occurs
    await client.close();
  }
})();
