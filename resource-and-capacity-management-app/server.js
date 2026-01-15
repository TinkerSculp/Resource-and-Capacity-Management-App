require('dotenv').config();

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// -----------------------------------------------------------------------------
// MongoDB Configuration
// -----------------------------------------------------------------------------

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

function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected yet' });
  req.db = db;
  next();
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB successfully');
    console.log('Using database:', dbName);
    await db.command({ ping: 1 });
    console.log('MongoDB connection verified');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Health Check Endpoint
// -----------------------------------------------------------------------------

app.get('/api/Resource-Manager/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

app.use(requireDB);

// -----------------------------------------------------------------------------
// Debug Route: Sample Data
// -----------------------------------------------------------------------------

app.get('/api/Resource-Manager/data', async (req, res) => {
  try {
    const collection = req.db.collection('account');
    const results = await collection.find({}).limit(50).toArray();
    res.json(results);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// -----------------------------------------------------------------------------
// Authentication: LOGIN
// -----------------------------------------------------------------------------

app.post('/api/Resource-Manager/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const collection = db.collection('account');
    const user = await collection.findOne({ 'account.username': username });

    if (!user || user.account.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeUser = {
      emp_id: user.emp_id,
      username: user.account.username,
      acc_type_id: user.account.acc_type_id,
      account_id: user.account.account_id
    };

    res.json({ message: 'Login successful', user: safeUser });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// -----------------------------------------------------------------------------
// Authentication: REGISTER
// -----------------------------------------------------------------------------

app.post('/api/Resource-Manager/auth/register', async (req, res) => {
  try {
    const { emp_id, username, password, acc_type_id } = req.body;
    if (!emp_id || !username || !password) {
      return res.status(400).json({ error: 'emp_id, username, and password are required' });
    }

    const collection = db.collection('account');
    const existingUser = await collection.findOne({ 'account.username': username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const newAccount = {
      emp_id,
      account: {
        username,
        password,
        acc_type_id: acc_type_id || 2,
        account_id: String(emp_id).padStart(7, '0')
      }
    };

    const result = await collection.insertOne(newAccount);

    const safeUser = {
      emp_id: newAccount.emp_id,
      username: newAccount.account.username,
      acc_type_id: newAccount.account.acc_type_id,
      account_id: newAccount.account.account_id
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: { ...safeUser, _id: result.insertedId }
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// -----------------------------------------------------------------------------
// Authentication: FORGOT PASSWORD
// -----------------------------------------------------------------------------

app.post('/api/Resource-Manager/auth/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const collection = db.collection('account');
    const user = await collection.findOne({ 'account.username': username });

    if (!user) {
      return res.json({ success: false });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// -----------------------------------------------------------------------------
// Resources Endpoints
// -----------------------------------------------------------------------------

app.get('/api/Resource-Manager/resources', async (req, res) => {
  try {
    const resources = await req.db.collection('resources').find({}).toArray();
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Error fetching resources' });
  }
});

app.post('/api/Resource-Manager/resources', async (req, res) => {
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

// -----------------------------------------------------------------------------
// Activities Endpoints
// -----------------------------------------------------------------------------

app.get('/api/Resource-Manager/activities', async (req, res) => {
  try {
    const activities = await req.db.collection('activities').find({}).toArray();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Error fetching activities' });
  }
});

app.post('/api/Resource-Manager/activities', async (req, res) => {
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

// -----------------------------------------------------------------------------
// 404 Handler
// -----------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Start Server After DB Connects
// -----------------------------------------------------------------------------

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`API server running on port ${port}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    await shutdown(1);
  }
})();