// require('dotenv').config();
// const { MongoClient, ServerApiVersion } = require('mongodb');

// const uri = 'mongodb+srv://jacksonbattista_db_user:C%40pstone%26Group7%21220624@rmapp-canadacentral.ycvntgt.mongodb.net/';
// const dbName = 'ResourceManagementAPP_DB';

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function listUsers() {
//   try {
//     await client.connect();
//     console.log('Connected to MongoDB');
    
//     const db = client.db(dbName);
//     const users = await db.collection('users').find({}).toArray();
    
//     console.log(`\nFound ${users.length} user(s) in the database:\n`);
//     users.forEach((user, index) => {
//       console.log(`User ${index + 1}:`);
//       console.log(`  Email: ${user.email}`);
//       console.log(`  Name: ${user.firstName} ${user.lastName}`);
//       console.log(`  Role: ${user.role || 'N/A'}`);
//       console.log(`  Department: ${user.department || 'N/A'}`);
//       console.log(`  Password: ${user.password}`);
//       console.log('');
//     });
    
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     await client.close();
//   }
// }

// listUsers();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = 'mongodb+srv://jacksonbattista_db_user:C%40pstone%26Group7%21220624@rmapp-canadacentral.ycvntgt.mongodb.net/';
const dbName = 'ResourceManagementAPP_DB';

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
    const accounts = await db.collection('account').find({}).toArray();

    console.log(`\nFound ${accounts.length} account(s) in the database:\n`);

    accounts.forEach((user, index) => {
      const acc = user.account || {};

      console.log(`User ${index + 1}:`);
      console.log(`  Username: ${acc.username || '[missing]'}`);
      console.log(`  Employee ID: ${user.emp_id || '[missing]'}`);
      console.log(`  Account ID: ${acc.account_id || '[missing]'}`);
      console.log(`  Account Type: ${acc.acc_type_id || '[missing]'}`);
      console.log(`  Password: ${acc.password || '[hidden]'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

listUsers();
