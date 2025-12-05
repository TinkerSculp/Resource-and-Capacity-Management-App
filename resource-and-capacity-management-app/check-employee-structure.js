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

async function checkEmployeeStructure() {
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const employeeCollection = db.collection('employee');
    
    // Get Charlotte's employee record
    const charlotte = await employeeCollection.findOne({ emp_id: 1002 });
    
    console.log('Charlotte\'s employee record (emp_id: 1002):');
    console.log(JSON.stringify(charlotte, null, 2));
    
    // Also check a sample assignment to see the leader name format
    console.log('\n--- Sample assignment with Charlotte as leader ---');
    const assignmentCollection = db.collection('assignment');
    const assignment = await assignmentCollection.findOne({ leader: /nguyen/i });
    
    if (assignment) {
      console.log('Leader field:', assignment.leader);
      console.log('Status:', assignment.status);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkEmployeeStructure();
