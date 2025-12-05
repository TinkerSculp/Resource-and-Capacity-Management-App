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

async function listUsers() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`\nFound ${users.length} user(s) in the database:\n`);
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Role: ${user.role || 'N/A'}`);
      console.log(`  Department: ${user.department || 'N/A'}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

listUsers();
