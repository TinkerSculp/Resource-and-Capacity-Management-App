import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// ---------------------------------------------------------
// MongoDB Connection Setup (Native Driver)
// ---------------------------------------------------------

// Connection string from environment variables
const uri = process.env.MONGODB_URI;

// Create a single MongoClient instance for reuse
const client = new MongoClient(uri);

/**
 * Ensures a single, reusable MongoDB connection.
 * - Prevents multiple connections during Next.js hot reloads
 * - Returns the active database instance
 */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("✅ Connected to MongoDB (Native Driver)");
  }
  return client.db();
}

// ---------------------------------------------------------
// GET /api/Resource-Manager/profile
// Fetches full profile details for a given username
// ---------------------------------------------------------

export async function GET(req) {
  try {
    // Extract username from query string
    const username = req.nextUrl.searchParams.get('username');

    // Validate required input
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    // Connect to database
    const db = await connectDB();

    // -----------------------------------------------------
    // 1. Look up account using nested field: account.username
    // -----------------------------------------------------
    const accountDoc = await db.collection('account').findOne({
      'account.username': username.trim()
    });

    if (!accountDoc) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Extract foreign keys from account document
    const empId = accountDoc.emp_id;
    const accTypeId = accountDoc.account?.acc_type_id;

    console.log("🔍 emp_id:", empId);
    console.log("🔍 acc_type_id:", accTypeId);

    // -----------------------------------------------------
    // 2. Fetch employee details using emp_id
    // -----------------------------------------------------
    const employee = await db.collection('employee').findOne({ emp_id: empId });

    // -----------------------------------------------------
    // 3. Fetch department details using dept_no from employee
    // -----------------------------------------------------
    const department = employee
      ? await db.collection('department').findOne({ dept_no: employee.dept_no })
      : null;

    // -----------------------------------------------------
    // 4. Fetch account type (role) using acc_type_id
    // -----------------------------------------------------
    const accountType = await db.collection('account_type').findOne({
      acc_type_id: accTypeId
    });

    if (!accountType) {
      console.log("⚠️ Account type not found for acc_type_id:", accTypeId);
    }

    // -----------------------------------------------------
    // 5. Build final profile response object
    // -----------------------------------------------------
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
    // Catch unexpected server errors
    console.error("🔥 Profile API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}