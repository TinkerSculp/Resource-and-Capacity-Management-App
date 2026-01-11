// Load environment variables from the .env file
require('dotenv').config();

// Import the MongoDB client
const { MongoClient } = require('mongodb');

// Read connection string and database name from environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Read the username argument passed from the command line
const username = process.argv[2];

// Ensure a username was provided before running the script
if (!username) {
  console.log("Usage: node debug/find-user.js <username>");
  process.exit(1);
}

(async () => {
  // Create a new MongoDB client instance
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);

    console.log(`Searching for username: ${username}`);

    // Query the "account" collection for a matching username
    const user = await db.collection('account').findOne({
      'account.username': username
    });

    // Handle case where no matching user is found
    if (!user) {
      console.log("\n❌ No user found.");
    } else {
      // Pretty‑print the found user document
      console.log("\n✅ User found:");
      console.log(JSON.stringify(user, null, 2));
    }

  } catch (err) {
    // Log any unexpected errors during execution
    console.error("Error:", err);
  } finally {
    // Always close the database connection
    await client.close();
  }
})();
