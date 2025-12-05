require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'resource_management';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function checkUsers() {
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Count total users
    const userCount = await usersCollection.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('\n⚠️  No users found in the database.');
      console.log('\nYou can create a test user by running:');
      console.log('node create-test-user.js\n');
    } else {
      console.log('\n📋 Existing users:');
      console.log('===================');
      const users = await usersCollection.find({}).toArray();
      
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Password: ${user.password || '[hidden]'}`);
      });
      
      console.log('\n✅ You can test login with any of the above email addresses.\n');
    }
    
  } catch (error) {
    console.error('Error checking users:', error.message);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

checkUsers();
