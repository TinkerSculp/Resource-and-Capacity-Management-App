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

// async function updateUser() {
//   try {
//     await client.connect();
//     console.log('Connected to MongoDB');
    
//     const db = client.db(dbName);
//     const usersCollection = db.collection('users');
    
//     // Update the existing test user to add username field
//     const result = await usersCollection.updateOne(
//       { email: 'test@example.com' },
//       { $set: { username: 'testuser' } }
//     );
    
//     if (result.matchedCount > 0) {
//       console.log('\n✅ User updated successfully!');
//       console.log('Added username: testuser');
//       console.log('\nLogin credentials:');
//       console.log('Username: testuser');
//       console.log('Password: password123');
//     } else {
//       console.log('\n⚠️  No user found with email test@example.com');
//     }
    
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     await client.close();
//   }
// }

// // updateUser();
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

// async function updateUser() {
//   try {
//     await client.connect();
//     console.log('Connected to MongoDB');

//     const db = client.db(dbName);
//     const accountCollection = db.collection('account');

//     // Update a user by emp_id (since your DB does not use email)
//     const result = await accountCollection.updateOne(
//       { emp_id: 1503 }, // change this to the employee you want to update
//       { $set: { "account.username": "testuser" } }
//     );

//     if (result.matchedCount > 0) {
//       console.log('\n✅ User updated successfully!');
//       console.log('Updated username to: testuser');
//     } else {
//       console.log('\n⚠️  No user found with emp_id 1503');
//     }

//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     await client.close();
//   }
// }

// updateUser();
