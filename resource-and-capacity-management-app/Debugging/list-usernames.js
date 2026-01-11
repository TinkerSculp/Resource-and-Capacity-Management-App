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

    // Fetch all user documents from the "account" collection
    const users = await db.collection('account').find({}).toArray();

    console.log("\n📋 User Accounts");
    console.log("================");

    // Loop through each user and print username + account type
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.account.username}  (type: ${u.account.acc_type_id})`);
    });

  } catch (err) {
    // Log any unexpected errors during execution
    console.error("Error:", err);
  } finally {
    // Always close the database connection
    await client.close();
  }
})();
