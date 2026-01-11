// Load environment variables from .env file
require('dotenv').config();

// Import MongoDB client
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

    // Track seen values to detect duplicates
    const seen = {
      username: {},
      emp_id: {},
      account_id: {}
    };

    console.log("\n🔍 Checking for duplicates...\n");

    // Iterate through each user document
    users.forEach(u => {
      const { emp_id, account } = u;

      // Check for duplicate usernames
      if (seen.username[account.username]) {
        console.log(`Duplicate username: ${account.username}`);
      }
      seen.username[account.username] = true;

      // Check for duplicate employee IDs
      if (seen.emp_id[emp_id]) {
        console.log(`Duplicate emp_id: ${emp_id}`);
      }
      seen.emp_id[emp_id] = true;

      // Check for duplicate account IDs
      if (seen.account_id[account.account_id]) {
        console.log(`Duplicate account_id: ${account.account_id}`);
      }
      seen.account_id[account.account_id] = true;
    });

    console.log("\nDuplicate check complete.\n");

  } catch (err) {
    // Log any unexpected errors
    console.error("Duplicate Check Error:", err);
  } finally {
    // Always close the DB connection
    await client.close();
  }
})();
