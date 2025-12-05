require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = 'mongodb+srv://jaredgutierrezjg_db_user:C%40pstone%26Group7%21002@rmapp-canadacentral.ycvntgt.mongodb.net/';
const dbName = 'ResourceManagementAPP_DB';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function findCharlotte() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // First find Charlotte in employee collection - try different variations
    const employeeCollection = db.collection('employee');
    
    // Try regex search for Charlotte and Nguyen
    let charlotte = await employeeCollection.findOne({ 
      first_name: /charlotte/i,
      last_name: /nguyen/i
    });
    
    // If not found, search in assignment collection for leader name
    if (!charlotte) {
      console.log('Searching in assignment collection for Charlotte Nguyen...');
      const assignmentCollection = db.collection('assignment');
      const assignment = await assignmentCollection.findOne({ 
        leader: /charlotte.*nguyen/i
      });
      
      if (assignment) {
        console.log('\nFound Charlotte as leader:', assignment.leader);
        // Now find employee by exact name from assignment
        charlotte = await employeeCollection.findOne({
          $expr: {
            $eq: [
              { $concat: ["$first_name", " ", "$last_name"] },
              assignment.leader
            ]
          }
        });
      }
    }
    
    if (charlotte) {
      console.log('\n--- Charlotte Nguyen found in employee collection ---');
      console.log('Employee ID:', charlotte.emp_id);
      console.log('Name:', charlotte.first_name, charlotte.last_name);
      
      // Now find her account using emp_id
      const accountCollection = db.collection('account');
      const account = await accountCollection.findOne({ 
        emp_id: charlotte.emp_id 
      });
      
      if (account) {
        console.log('\n--- Login Credentials ---');
        console.log('Username:', account.account.username);
        console.log('Password:', account.account.password);
        console.log('Account ID:', account.account.account_id);
        console.log('Account Type ID:', account.account.acc_type_id);
      } else {
        console.log('\nNo account found for Charlotte Nguyen');
      }
    } else {
      console.log('\nCharlotte Nguyen not found in employee collection');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findCharlotte();
