require('dotenv').config();

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

// -----------------------------------------------------------------------------
// Import Model Functions
// These functions handle employee CRUD, capacity updates, and department lookups
// -----------------------------------------------------------------------------
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  getEmployeeCapacity,
  updateEmployeeCapacity,
  getAllDepartments,
  getAllManagers
} = require('./models/ResourceManager/Create_Edit_Resources');

const app = express();
const port = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

// CORS configuration for frontend access
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// -----------------------------------------------------------------------------
// MongoDB Configuration
// -----------------------------------------------------------------------------

// Connection string and DB name from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ResourceManagementAPP_DB';

// MongoDB client with stable API versioning
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

/**
 * Ensures DB is connected before handling requests.
 * If DB is not ready, returns a 503 Service Unavailable.
 */
function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ error: 'Database not connected yet' });
  req.db = db;
  next();
}

/**
 * Establishes the MongoDB connection once at server startup.
 * - Stores the DB instance globally
 * - Verifies connection with a ping command
 */
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

// Attach DB middleware after health check
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

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const collection = db.collection('account');
    const user = await collection.findOne({ 'account.username': username });

    // Validate credentials
    if (!user || user.account.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return safe user object (no password)
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

    // Required fields
    if (!emp_id || !username || !password) {
      return res.status(400).json({ error: 'emp_id, username, and password are required' });
    }

    const collection = db.collection('account');

    // Prevent duplicate usernames
    const existingUser = await collection.findOne({ 'account.username': username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Build new account document
    const newAccount = {
      emp_id,
      account: {
        username,
        password,
        acc_type_id: acc_type_id || 2, // Default to standard user
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
// EMPLOYEE MANAGEMENT
// -----------------------------------------------------------------------------

// GET ALL EMPLOYEES
app.get('/api/Resource-Manager/employees', async (req, res) => {
  try {
    const employees = await getAllEmployees(req.db, req.query);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Error fetching employees' });
  }
});

// GET EMPLOYEE BY ID
app.get('/api/Resource-Manager/employees/:id', async (req, res) => {
  try {
    const employee = await getEmployeeById(req.db, req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Error fetching employee' });
  }
});

// CREATE EMPLOYEE
app.post('/api/Resource-Manager/employees', async (req, res) => {
  try {
    const result = await createEmployee(req.db, req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json({
      message: 'Employee created successfully',
      employee: result.employee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Unable to save employee. Please try again or contact support.' });
  }
});

// UPDATE EMPLOYEE
app.put('/api/Resource-Manager/employees/:id', async (req, res) => {
  try {
    const result = await updateEmployee(req.db, req.params.id, req.body);
    if (!result.success) {
      const statusCode = result.error === 'Employee not found' ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }
    res.json({
      message: 'Employee updated successfully',
      employee: result.employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Unable to update employee. Please try again or contact support.' });
  }
});

// UPDATE EMPLOYEE STATUS
app.patch('/api/Resource-Manager/employees/:id/status', async (req, res) => {
  try {
    const { status, comments } = req.body;
    const result = await updateEmployeeStatus(req.db, req.params.id, status, comments);
    if (!result.success) {
      const statusCode = result.error === 'Employee not found' ? 404 : 400;
      return res.status(statusCode).json({ error: result.error });
    }
    res.json({
      message: `Employee status changed to ${status} successfully`,
      emp_id: result.emp_id,
      new_status: result.new_status
    });
  } catch (error) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ error: 'Unable to update status. Please try again or contact support.' });
  }
});

// GET EMPLOYEE CAPACITY
app.get('/api/Resource-Manager/employees/:id/capacity', async (req, res) => {
  try {
    const capacity = await getEmployeeCapacity(req.db, req.params.id);
    if (!capacity) {
      return res.status(404).json({ error: 'No capacity records found for this employee' });
    }
    res.json(capacity);
  } catch (error) {
    console.error('Error fetching capacity:', error);
    res.status(500).json({ error: 'Error fetching capacity data' });
  }
});

// UPDATE EMPLOYEE CAPACITY
app.put('/api/Resource-Manager/employees/:id/capacity', async (req, res) => {
  try {
    const result = await updateEmployeeCapacity(req.db, req.params.id, req.body.updates);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({
      message: 'Capacity updated successfully',
      emp_id: result.emp_id
    });
  } catch (error) {
    console.error('Error updating capacity:', error);
    res.status(500).json({ error: 'Unable to update capacity. Please try again or contact support.' });
  }
});

// -----------------------------------------------------------------------------
// DEPARTMENTS & MANAGERS
// -----------------------------------------------------------------------------

app.get('/api/Resource-Manager/departments', async (req, res) => {
  try {
    const departments = await getAllDepartments(req.db);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Error fetching departments' });
  }
});

app.get('/api/Resource-Manager/managers', async (req, res) => {
  try {
    const managers = await getAllManagers(req.db);
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Error fetching managers' });
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