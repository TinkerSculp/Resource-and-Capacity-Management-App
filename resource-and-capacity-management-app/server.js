require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Change to propper port if needed

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB configuration
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'resource_management';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB successfully');
    
    // Test connection
    await db.command({ ping: 1 });
    console.log('MongoDB connection verified');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize database connection
connectDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Example API route to fetch data
app.get('/api/data', async (req, res) => {
  try {
    const collection = db.collection('your_collection');
    const results = await collection.find({}).toArray();
    res.json(results);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Example API route to add data
app.post('/api/data', async (req, res) => {
  try {
    const { name, value } = req.body;
    
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }

    const collection = db.collection('your_collection');
    const result = await collection.insertOne({ 
      name, 
      value,
      createdAt: new Date()
    });
    
    res.status(201).json({ 
      message: 'Data added successfully', 
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Error inserting data' });
  }
});

// Resources endpoints
app.get('/api/resources', async (req, res) => {
  try {
    const collection = db.collection('resources');
    const resources = await collection.find({}).toArray();
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Error fetching resources' });
  }
});

app.post('/api/resources', async (req, res) => {
  try {
    const collection = db.collection('resources');
    const result = await collection.insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ 
      message: 'Resource created successfully', 
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Error creating resource' });
  }
});

// Activities endpoints
app.get('/api/activities', async (req, res) => {
  try {
    const collection = db.collection('activities');
    const activities = await collection.find({}).toArray();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Error fetching activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const collection = db.collection('activities');
    const result = await collection.insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ 
      message: 'Activity created successfully', 
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Error creating activity' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nClosing MongoDB connection...');
  await client.close();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});