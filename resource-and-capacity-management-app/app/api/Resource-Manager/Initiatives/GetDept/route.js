import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/* ---------------------------------------------------------
   MONGODB CONNECTION SETUP
   - Loads connection string from environment
   - Reuses a single MongoClient instance
   - Prevents duplicate connections during hot reloads
--------------------------------------------------------- */

// Connection string loaded from environment variables
const uri = process.env.MONGODB_URI;

// Shared MongoDB client instance
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   CONNECT TO DATABASE
   - Opens a connection only if not already active
   - Ensures stable DB access across API calls
   - Returns active database instance (explicit DB name)
--------------------------------------------------------- */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db("ResourceManagementAPP_DB");
}

/* ---------------------------------------------------------
   GET /api/Resource-Manager/Initiatives/GetDept
   - Returns department information for a given employee name
   - Used by Add/Edit Initiative forms to auto-fill department
--------------------------------------------------------- */
export async function GET(request) {
  try {
    const db = await connectDB();

    // Extract "name" query parameter
    const name = request.nextUrl.searchParams.get("name");

    /* ---------------------------------------------------------
       INPUT VALIDATION
       - Employee name must be provided
    --------------------------------------------------------- */
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       LOOKUP EMPLOYEE BY NAME
       - Matches employee by exact emp_name
       - Returns 404 if employee does not exist
    --------------------------------------------------------- */
    const emp = await db.collection("employee").findOne({ emp_name: name });

    if (!emp) {
      return NextResponse.json(
        { error: `Employee "${name}" not found` },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------
       LOOKUP DEPARTMENT USING dept_no
       - employee.dept_no → department.dept_no
       - If department missing, return empty string
    --------------------------------------------------------- */
    const dept = await db
      .collection("department")
      .findOne({ dept_no: emp.dept_no });

    /* ---------------------------------------------------------
       SUCCESS RESPONSE
       - Returns department number + department name
    --------------------------------------------------------- */
    return NextResponse.json({
      dept_no: emp.dept_no,
      dept_name: dept?.dept_name || "",
    });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs unexpected server errors
       - Returns generic failure response
    --------------------------------------------------------- */
    console.error("GetDept API error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}