require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = 'mongodb+srv://jaredgutierrezjg_db_user:C%40pstone%26Group7%21002@rmapp-canadacentral.ycvntgt.mongodb.net/';
const dbName = 'resource_management';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function updateUser() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Update the existing test user to add username field
    const result = await usersCollection.updateOne(
      { email: 'test@example.com' },
      { $set: { username: 'testuser' } }
    );
    
    if (result.matchedCount > 0) {
      console.log('\n✅ User updated successfully!');
      console.log('Added username: testuser');
      console.log('\nLogin credentials:');
      console.log('Username: testuser');
      console.log('Password: password123');
    } else {
      console.log('\n⚠️  No user found with email test@example.com');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateUser();
