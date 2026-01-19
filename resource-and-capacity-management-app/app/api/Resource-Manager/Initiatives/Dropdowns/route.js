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
// GET /api/Resource-Manager/Initiatives/dropdowns
// Loads dropdown values for:
//   - Leads (acc_type_id = 1)
//   - Requestors + Requestor VPs (acc_type_id = 1 or 2)
// ---------------------------------------------------------
export async function GET() {
  try {
    const db = await connectDB();

    // ---------------------------------------------------------
    // LEADS (acc_type_id = 1)
    // ---------------------------------------------------------
    /**
     * Pulls all Resource Managers.
     * - Matches accounts with acc_type_id = 1
     * - Joins employee info via emp_id
     * - Returns only employee names
     */
    const leads = await db.collection("account").aggregate([
      {
        $match: {
          "account.acc_type_id": 1, // Resource Managers only
        },
      },
      {
        $lookup: {
          from: "employee", // Join employee collection
          localField: "emp_id",
          foreignField: "emp_id",
          as: "employee_info",
        },
      },
      { $unwind: "$employee_info" }, // Flatten joined array
      {
        $project: {
          _id: 0,
          emp_name: "$employee_info.emp_name", // Only return name
        },
      },
    ]).toArray();

    // ---------------------------------------------------------
    // REQUESTORS + REQUESTOR VPs (acc_type_id = 1 or 2)
    // ---------------------------------------------------------
    /**
     * Pulls all employees who can appear in:
     * - Requestor dropdown
     * - Requestor VP dropdown
     *
     * Includes:
     * - acc_type_id = 1 (Resource Managers)
     * - acc_type_id = 2 (Requestors / VPs)
     *
     * Returns:
     * - emp_name
     * - acc_type_id (useful for sorting or grouping)
     */
    const requestors = await db.collection("account").aggregate([
      {
        $match: {
          "account.acc_type_id": { $in: [1, 2] }, // Both RM + Requestor/VP
        },
      },
      {
        $lookup: {
          from: "employee",
          localField: "emp_id",
          foreignField: "emp_id",
          as: "employee_info",
        },
      },
      { $unwind: "$employee_info" },
      {
        $project: {
          _id: 0,
          emp_name: "$employee_info.emp_name",
          acc_type_id: "$account.acc_type_id", // Useful for UI sorting
        },
      },
    ]).toArray();

    // ---------------------------------------------------------
    // RESPONSE PAYLOAD
    // ---------------------------------------------------------
    return NextResponse.json({
      employees: leads,      // Lead dropdown (unchanged)
      requestors: requestors // Updated requestor + VP list
    });

  } catch (err) {
    console.error("Dropdown API error:", err);

    return NextResponse.json(
      { error: "Failed to load employee names" },
      { status: 500 }
    );
  }
}