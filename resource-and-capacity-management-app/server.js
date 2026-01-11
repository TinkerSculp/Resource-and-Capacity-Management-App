require('dotenv').config();
// Load environment variables from .env

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

// CORS configuration (allows frontend to access API)
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));   // Enable CORS
app.use(express.json());      // Parse JSON request bodies

// -----------------------------------------------------------------------------
// MongoDB Configuration
// -----------------------------------------------------------------------------

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

// Create MongoDB client with stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db; // Will hold the connected database instance

// Middleware to ensure DB is ready before handling requests
function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected yet' });
  req.db = db; // Attach DB instance to request
  next();
}

// Connect to MongoDB and verify connection
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);

    console.log('Connected to MongoDB successfully');
    console.log('Using database:', dbName);

    // Ping to confirm connection
    await db.command({ ping: 1 });
    console.log('MongoDB connection verified');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit if DB connection fails
  }
}

// -----------------------------------------------------------------------------
// Health Check Endpoint
// -----------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Apply DB requirement middleware to all routes below
app.use(requireDB);

// -----------------------------------------------------------------------------
// Debug Route: Return sample data from "account" collection
// -----------------------------------------------------------------------------

app.get('/api/data', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const collection = db.collection('account');

    // Find user by nested username field
    const user = await collection.findOne({ 'account.username': username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Password check (plaintext for now — replace with bcrypt in production)
    if (user.account.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Build safe user object (exclude password)
    const safeUser = {
      emp_id: user.emp_id,
      username: user.account.username,
      acc_type_id: user.account.acc_type_id,
      account_id: user.account.account_id
    };

    res.json({
      message: 'Login successful',
      user: safeUser
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// -----------------------------------------------------------------------------
// Authentication: REGISTER
// -----------------------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { emp_id, username, password, acc_type_id } = req.body;

    // Validate required fields
    if (!emp_id || !username || !password) {
      return res.status(400).json({ error: 'emp_id, username, and password are required' });
    }

    const collection = db.collection('account');

    // Check if username already exists
    const existingUser = await collection.findOne({ 'account.username': username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Build new account document
    const newAccount = {
      emp_id,
      account: {
        username,
        password, // TODO: hash in production
        acc_type_id: acc_type_id || 2,
        account_id: String(emp_id).padStart(7, '0') // e.g., "0001503"
      }
    };

    const result = await collection.insertOne(newAccount);

    // Safe user object
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
// Resources Endpoints
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Activities Endpoints
// -----------------------------------------------------------------------------

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
