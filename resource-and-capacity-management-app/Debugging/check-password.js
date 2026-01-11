// Load environment variables from .env file
require('dotenv').config();

// Import MongoDB client
const { MongoClient } = require('mongodb');

// Read connection string and database name from environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

// Read CLI arguments: username + password
const username = process.argv[2];
const password = process.argv[3];

// Ensure both arguments were provided
if (!username || !password) {
  console.log("Usage: node debug/check-password.js <username> <password>");
  process.exit(1);
}

(async () => {
  // Create a new MongoDB client instance
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);

    // Look up the user by nested username field
    const user = await db.collection('account').findOne({
      'account.username': username
    });

    // If no user exists with that username
    if (!user) {
      console.log("\n❌ Username not found.");
      return;
    }

    // Compare stored password with provided password
    // (Plaintext for debugging — production should use hashing)
    if (user.account.password === password) {
      console.log("\n✅ Password matches.");
    } else {
      console.log("\n❌ Incorrect password.");
    }

  } catch (err) {
    // Log any unexpected errors
    console.error("Error:", err);
  } finally {
    // Always close the DB connection
    await client.close();
  }
})();
