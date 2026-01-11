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

    // Retrieve all user documents from the "account" collection
    const users = await db.collection('account').find({}).toArray();

    console.log("\n🔍 Validating account structure...\n");

    // Loop through each user and validate required fields
    users.forEach((u, i) => {
      const issues = [];

      // Check for required top‑level fields
      if (!u.emp_id) issues.push("Missing emp_id");
      if (!u.account) issues.push("Missing account object");
      else {
        // Validate required nested account fields
        if (!u.account.username) issues.push("Missing username");
        if (!u.account.password) issues.push("Missing password");
        if (!u.account.acc_type_id) issues.push("Missing acc_type_id");
        if (!u.account.account_id) issues.push("Missing account_id");
      }

      // If any issues were found, print them with the user index
      if (issues.length > 0) {
        console.log(`${i + 1}. User has issues:`, issues);
      }
    });

    console.log("\nValidation complete.\n");

  } catch (err) {
    // Log unexpected errors during execution
    console.error("Validation Error:", err);
  } finally {
    // Always close the database connection
    await client.close();
  }
})();
