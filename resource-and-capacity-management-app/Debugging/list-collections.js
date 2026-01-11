// Load environment variables from the .env file
require('dotenv').config();

// Import the MongoDB client
const { MongoClient } = require('mongodb');

// Read connection string and database name from environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

(async () => {
  // Create a new MongoDB client instance
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);

    console.log(`Connected to MongoDB: ${dbName}`);

    // Retrieve a list of all collections in the database
    const collections = await db.listCollections().toArray();

    console.log('\nCollections:');

    // Loop through each collection and print its name + document count
    for (const col of collections) {
      // Count how many documents exist in the current collection
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name} (${count} docs)`);
    }

  } catch (err) {
    // Log any unexpected errors during execution
    console.error('List Collections Error:', err);
  } finally {
    // Always close the database connection
    await client.close();
  }
})();
