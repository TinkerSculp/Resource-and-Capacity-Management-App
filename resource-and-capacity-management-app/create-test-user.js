// require('dotenv').config();
// const { MongoClient, ServerApiVersion } = require('mongodb');

// const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function createTestUser() {
//   try {
//     await client.connect();
//     console.log('Connected to MongoDB');
    
//     const db = client.db(dbName);
//     const usersCollection = db.collection('users');
    
//     // Check if test user already exists
//     const existingUser = await usersCollection.findOne({ username: 'testuser' });
    
//     if (existingUser) {
//       console.log('\n⚠️  Test user already exists!');
//       console.log('\nLogin credentials:');
//       console.log('Username: testuser');
//       console.log('Password: password123');
//       return;
//     }
    
//     // Create test user
//     const testUser = {
//       username: 'testuser',
//       email: 'test@example.com',
//       password: 'password123', // Plain text for development only
//       firstName: 'Test',
//       lastName: 'User',
//       title: 'Developer',
//       department: 'IT',
//       role: 'admin',
//       permissions: [],
//       status: true,
//       createdAt: new Date()
//     };
    
//     await usersCollection.insertOne(testUser);
    
//     console.log('\n✅ Test user created successfully!');
//     console.log('\nLogin credentials:');
//     console.log('Username: testuser');
//     console.log('Password: password123');
    
//   } catch (error) {
//     console.error('Error creating test user:', error);
//   } finally {
//     await client.close();
//   }
// }

// createTestUser();
