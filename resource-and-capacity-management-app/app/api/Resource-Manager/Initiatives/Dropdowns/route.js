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
   GET /api/Resource-Manager/Initiatives/dropdowns
   - Loads dropdown values for:
       • Leads (acc_type_id = 1)
       • Requestors + Requestor VPs (acc_type_id = 1 or 2)
   - Used by Add/Edit Initiative forms
--------------------------------------------------------- */
export async function GET() {
  try {
    const db = await connectDB();

    /* ---------------------------------------------------------
       LEADS (acc_type_id = 1)
       - Fetches all Resource Managers
       - Joins employee info via emp_id
       - Returns only employee names
    --------------------------------------------------------- */
    const leads = await db.collection("account").aggregate([
      {
        $match: {
          "account.acc_type_id": 1, // Resource Managers only
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
        },
      },
    ]).toArray();

    /* ---------------------------------------------------------
       REQUESTORS + REQUESTOR VPs (acc_type_id = 1 or 2)
       - Fetches all employees eligible for:
           • Requestor dropdown
           • Requestor VP dropdown
       - Includes:
           • Resource Managers (1)
           • Requestors / VPs (2)
       - Returns:
           • emp_name
           • acc_type_id (useful for UI grouping)
    --------------------------------------------------------- */
    const requestors = await db.collection("account").aggregate([
      {
        $match: {
          "account.acc_type_id": { $in: [1, 2] },
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
          acc_type_id: "$account.acc_type_id",
        },
      },
    ]).toArray();

    /* ---------------------------------------------------------
       RESPONSE PAYLOAD
       - Returns structured dropdown lists
       - Used by frontend initiative forms
    --------------------------------------------------------- */
    return NextResponse.json({
      employees: leads,
      requestors: requestors,
    });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs unexpected server errors
       - Returns generic failure response
    --------------------------------------------------------- */
    console.error("Dropdown API error:", err);

    return NextResponse.json(
      { error: "Failed to load employee names" },
      { status: 500 }
    );
  }
}