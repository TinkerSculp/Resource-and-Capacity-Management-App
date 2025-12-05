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

async function searchForCharlotte() {
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(dbName);
    
    // Search assignment collection for any Charlotte
    console.log('--- Searching assignments for Charlotte ---');
    const assignmentCollection = db.collection('assignment');
    const assignments = await assignmentCollection.find({ 
      leader: /charlotte/i 
    }).limit(5).toArray();
    
    if (assignments.length > 0) {
      console.log(`Found ${assignments.length} assignment(s) with Charlotte as leader:`);
      const leaderName = assignments[0].leader;
      console.log('Leader name format:', leaderName);
      
      // Now search for matching employee
      console.log('\n--- Searching for matching employee ---');
      const employeeCollection = db.collection('employee');
      const allEmployees = await employeeCollection.find({}).toArray();
      
      const matchingEmployee = allEmployees.find(emp => {
        const fullName = `${emp.first_name} ${emp.last_name}`;
        return fullName === leaderName;
      });
      
      if (matchingEmployee) {
        console.log('Found employee:', matchingEmployee.first_name, matchingEmployee.last_name);
        console.log('Employee ID:', matchingEmployee.emp_id);
        
        // Find account
        const accountCollection = db.collection('account');
        const account = await accountCollection.findOne({ emp_id: matchingEmployee.emp_id });
        
        if (account) {
          console.log('\n=== LOGIN CREDENTIALS ===');
          console.log('Username:', account.account.username);
          console.log('Password:', account.account.password);
        }
      }
    } else {
      console.log('No assignments found for Charlotte');
      
      // List some leader names to see the format
      console.log('\n--- Sample leader names from assignments ---');
      const sampleAssignments = await assignmentCollection.find({}).limit(10).toArray();
      sampleAssignments.forEach(a => console.log('-', a.leader));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

searchForCharlotte();
