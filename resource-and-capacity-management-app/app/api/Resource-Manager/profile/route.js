import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/* ---------------------------------------------------------
   MONGODB CONNECTION SETUP
   - Loads connection string from environment
   - Reuses a single MongoClient instance
   - Prevents duplicate connections during hot reloads
--------------------------------------------------------- */

// Connection string from environment variables
const uri = process.env.MONGODB_URI;

// Shared MongoDB client instance
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   CONNECT TO DATABASE
   - Opens a connection only if not already active
   - Ensures stable DB access across API calls
   - Returns active database instance
--------------------------------------------------------- */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB (Native Driver)");
  }
  return client.db(); // Uses default DB from connection string
}

/* ---------------------------------------------------------
   GET /api/Resource-Manager/profile
   - Retrieves full profile information for a given username
   - Combines account, employee, department, and role data
--------------------------------------------------------- */
export async function GET(req) {
  try {
    // Extract username from query parameters
    const username = req.nextUrl.searchParams.get('username');

    /* ---------------------------------------------------------
       INPUT VALIDATION
       - Username must be provided
    --------------------------------------------------------- */
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    // Connect to database
    const db = await connectDB();

    /* ---------------------------------------------------------
       1. FETCH ACCOUNT RECORD
       - Matches nested field: account.username
       - Ensures exact match (no case-insensitive search)
    --------------------------------------------------------- */
    const accountDoc = await db.collection('account').findOne({
      'account.username': username.trim()
    });

    if (!accountDoc) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Extract foreign keys for additional lookups
    const empId = accountDoc.emp_id;
    const accTypeId = accountDoc.account?.acc_type_id;

    console.log("emp_id:", empId);
    console.log("acc_type_id:", accTypeId);

    /* ---------------------------------------------------------
       2. FETCH EMPLOYEE DETAILS
       - Uses emp_id from account record
    --------------------------------------------------------- */
    const employee = await db.collection('employee').findOne({ emp_id: empId });

    /* ---------------------------------------------------------
       3. FETCH DEPARTMENT DETAILS
       - Uses dept_no from employee record
    --------------------------------------------------------- */
    const department = employee
      ? await db.collection('department').findOne({ dept_no: employee.dept_no })
      : null;

    /* ---------------------------------------------------------
       4. FETCH ACCOUNT TYPE (ROLE)
       - Uses acc_type_id from account record
    --------------------------------------------------------- */
    const accountType = await db.collection('account_type').findOne({
      acc_type_id: accTypeId
    });

    if (!accountType) {
      console.log("Account type not found for acc_type_id:", accTypeId);
    }

    /* ---------------------------------------------------------
       5. BUILD FINAL PROFILE RESPONSE
       - Combines all related data into a single object
    --------------------------------------------------------- */
    const profile = {
      name: employee?.emp_name || "",
      title: employee?.emp_title || "",
      department: department?.dept_name || "",
      role: accountType?.acc_type || "",
      id: employee?.emp_id || ""
    };

    // Return profile to frontend
    return NextResponse.json(profile);

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Catches unexpected server errors
       - Returns generic error response
    --------------------------------------------------------- */
    console.error("Profile API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}