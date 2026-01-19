import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// ---------------------------------------------------------
// MONGODB CONNECTION SETUP
// ---------------------------------------------------------

// Connection string loaded from environment variables
const uri = process.env.MONGODB_URI;

// Create a reusable MongoDB client instance
const client = new MongoClient(uri);

/**
 * Establishes a connection to MongoDB.
 * - Reuses the existing client during hot reloads
 * - Prevents multiple parallel connections
 * - Returns the active database instance
 */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db("ResourceManagementAPP_DB");
}

// ---------------------------------------------------------
// GET /api/Resource-Manager/Initiatives/GetDept
// Returns department info for a given employee name
// ---------------------------------------------------------
export async function GET(request) {
  try {
    const db = await connectDB();

    // Extract "name" query parameter
    const name = request.nextUrl.searchParams.get("name");

    // Validate required parameter
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // LOOKUP EMPLOYEE BY NAME
    // ---------------------------------------------------------
    /**
     * Find the employee record by exact name match.
     * - emp_name must match exactly
     * - If employee does not exist, return 404
     */
    const emp = await db.collection("employee").findOne({ emp_name: name });

    if (!emp) {
      return NextResponse.json(
        { error: `Employee "${name}" not found` },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // LOOKUP DEPARTMENT USING dept_no
    // ---------------------------------------------------------
    /**
     * Department is linked via:
     *   employee.dept_no → department.dept_no
     *
     * If department is missing (rare), return empty string.
     */
    const dept = await db
      .collection("department")
      .findOne({ dept_no: emp.dept_no });

    // ---------------------------------------------------------
    // SUCCESS RESPONSE
    // ---------------------------------------------------------
    return NextResponse.json({
      dept_no: emp.dept_no,
      dept_name: dept?.dept_name || "",
    });

  } catch (err) {
    console.error("GetDept API error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}