require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB configuration
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// Ensure requests wait for DB readiness
function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected yet' });
  req.db = db;
  next();
}

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB successfully');
    console.log('Using database:', dbName);
    
    // Test connection
    await db.command({ ping: 1 });
    console.log('MongoDB connection verified');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Routes that require the DB
app.use(requireDB);

// Data sample routes (replace with real usage or remove)
app.get('/api/data', async (req, res) => {
  try {
    const collection = req.db.collection('account'); // use a real collection
    const results = await collection.find({}).limit(50).toArray();
    res.json(results);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || value === undefined) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    const result = await req.db.collection('account').insertOne({
      name,
      value,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ message: 'Data added successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Error inserting data' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const collection = db.collection('account');
    console.log('Searching for username:', username);
    console.log('In collection: account');
    console.log('Database:', db.databaseName);
    
    const user = await collection.findOne({ 'account.username': username });
    console.log('Query result:', user ? 'User found' : 'User NOT found');
    
    if (!user) {
      // Try to see if there are any users at all
      const count = await collection.countDocuments();
      console.log('Total documents in account collection:', count);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', user.account.username, 'checking password...');
    
    // Simple password check (in production, use bcrypt to hash passwords)
    if (user.account.password !== password) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Login successful for:', username);

    // Fetch employee name from employee collection
    const employeeCollection = db.collection('employee');
    const employee = await employeeCollection.findOne({ emp_id: user.emp_id });
    console.log('Employee lookup for emp_id:', user.emp_id, employee ? `Found: ${employee.emp_name}` : 'Not found');

    // Don't send password back to client
    const userWithoutPassword = {
      _id: user._id,
      emp_id: user.emp_id,
      emp_name: employee?.emp_name || null,
      account: {
        username: user.account.username,
        acc_type_id: user.account.acc_type_id,
        account_id: user.account.account_id
      }
    };
    
    res.json({ 
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, title, department, role } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const collection = db.collection('account');
    
    // Check if user already exists
    const existingUser = await collection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user (in production, hash the password with bcrypt)
    const newUser = {
      email: email.toLowerCase(),
      password: password, // TODO: Hash this in production
      firstName,
      lastName,
      title: title || '',
      department: department || '',
      role: role || 'user',
      permissions: [],
      status: true,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newUser);
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: { ...userWithoutPassword, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Resources endpoints
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await req.db.collection('resources').find({}).toArray();
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Error fetching resources' });
  }
});

app.post('/api/resources', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await req.db.collection('resources').insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ message: 'Resource created successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Error creating resource' });
  }
});

// Activities endpoints
app.get('/api/activities', async (req, res) => {
  try {
    const activities = await req.db.collection('activities').find({}).toArray();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Error fetching activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await req.db.collection('activities').insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ message: 'Activity created successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Error creating activity' });
  }
});

// Assignment count endpoints
app.get('/api/assignments/counts/all', async (req, res) => {
  try {
    const collection = db.collection('assignment');
    
    const active = await collection.countDocuments({ 
      status: { $in: ["On Going", "In Progress"] } 
    });
    
    const planned = await collection.countDocuments({ 
      status: "Planned" 
    });
    
    const onHold = await collection.countDocuments({ 
      status: "On Hold" 
    });
    
    const backlog = await collection.countDocuments({ 
      status: "Backlog" 
    });
    
    res.json({ active, planned, onHold, backlog });
  } catch (error) {
    console.error('Error fetching assignment counts:', error);
    res.status(500).json({ error: 'Error fetching counts' });
  }
});

app.get('/api/assignments/counts/mine', async (req, res) => {
  try {
    const { empId } = req.query;
    
    console.log('Mine filter requested for empId:', empId);
    
    if (!empId) {
      return res.status(400).json({ error: 'Employee ID required' });
    }
    
    const collection = db.collection('assignment');
    
    // First get the employee name from emp_id
    const employeeCollection = db.collection('employee');
    const employee = await employeeCollection.findOne({ emp_id: parseInt(empId) });
    
    console.log('Employee found:', employee ? employee.emp_name : 'NOT FOUND');
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const leaderName = employee.emp_name;
    console.log('Searching for leader name:', leaderName);
    
    // Check if any assignments exist for this leader
    const sampleAssignment = await collection.findOne({ leader: leaderName });
    console.log('Sample assignment found:', sampleAssignment ? 'YES' : 'NO');
    if (sampleAssignment) {
      console.log('Assignment leader:', sampleAssignment.leader);
      console.log('Assignment status:', sampleAssignment.status);
    }
    
    const active = await collection.countDocuments({ 
      leader: leaderName,
      status: { $in: ["On Going", "In Progress"] } 
    });
    
    const planned = await collection.countDocuments({ 
      leader: leaderName,
      status: "Planned" 
    });
    
    const onHold = await collection.countDocuments({ 
      leader: leaderName,
      status: "On Hold" 
    });
    
    const backlog = await collection.countDocuments({ 
      leader: leaderName,
      status: "Backlog" 
    });
    
    console.log('Counts for', leaderName, ':', { active, planned, onHold, backlog });
    
    res.json({ active, planned, onHold, backlog });
  } catch (error) {
    console.error('Error fetching user assignment counts:', error);
    res.status(500).json({ error: 'Error fetching counts' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
async function shutdown(code = 0) {
  try {
    console.log('Closing MongoDB connection...');
    await client.close();
  } catch (e) {
    console.error('Error during shutdown:', e);
  } finally {
    process.exit(code);
  }
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Start server after DB connects
(async () => {
  try {
    await connectDB();
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`API server running on ${host}:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await shutdown(1);
  }
})();