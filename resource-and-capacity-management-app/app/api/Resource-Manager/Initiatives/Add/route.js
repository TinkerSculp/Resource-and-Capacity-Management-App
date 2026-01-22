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
   POST /api/Resource-Manager/Initiatives/Add
   - Creates a new initiative record
   - Validates required fields
   - Validates user roles (Lead, Requestor, VP)
   - Auto‑assigns department based on VP
   - Inserts final initiative document into DB
--------------------------------------------------------- */
export async function POST(request) {
  try {
    const db = await connectDB();

    // Parse incoming JSON payload
    const body = await request.json();

    // Extract expected fields
    const {
      project,
      category,
      lead,
      status,
      requestor,
      requestor_vp,
      requesting_dept,
      completion_date,
      target_period,
      description,
      resource_consideration,
    } = body;

    /* ---------------------------------------------------------
       REQUIRED FIELD VALIDATION
       - Ensures mandatory fields are not empty
       - completion_date validated separately for Completed status
    --------------------------------------------------------- */

    const requiredFields = {
      project,
      category,
      lead,
      status,
      requestor,
      requestor_vp,
      target_period,
      description,
    };

    // Validate each required field
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return NextResponse.json(
          { error: `${key.replace(/_/g, " ")} is required.` },
          { status: 400 }
        );
      }
    }

    // Completed initiatives must include a completion date
    if (
      status === "Completed" &&
      (!completion_date || completion_date.trim() === "")
    ) {
      return NextResponse.json(
        {
          error:
            "Completion date is required when status is marked as Completed.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       USER VALIDATION HELPERS
       - Validates Lead, Requestor, and VP
       - Matches allowed account types
       - Joins employee info via emp_id
       - Matches employee name exactly
    --------------------------------------------------------- */

    const validateUser = async (name, accTypes) => {
      const result = await db
        .collection("account")
        .aggregate([
          { $match: { "account.acc_type_id": { $in: accTypes } } },
          {
            $lookup: {
              from: "employee",
              localField: "emp_id",
              foreignField: "emp_id",
              as: "employee_info",
            },
          },
          { $unwind: "$employee_info" },
          { $match: { "employee_info.emp_name": name } },
        ])
        .toArray();

      return result.length > 0 ? result[0].employee_info : null;
    };

    // Validate Lead (must be Resource Manager)
    const leadValid = await validateUser(lead, [1]);
    if (!leadValid) {
      return NextResponse.json(
        { error: `Lead "${lead}" is not a valid Resource Manager.` },
        { status: 400 }
      );
    }

    // Validate Requestor (allowed: 1 or 2)
    const requestorValid = await validateUser(requestor, [1, 2]);
    if (!requestorValid) {
      return NextResponse.json(
        { error: `Requestor "${requestor}" is not authorized.` },
        { status: 400 }
      );
    }

    // Validate Requestor VP (allowed: 1 or 2)
    const vpValid = await validateUser(requestor_vp, [1, 2]);
    if (!vpValid) {
      return NextResponse.json(
        { error: `Requestor VP "${requestor_vp}" is not authorized.` },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       AUTO‑ASSIGN DEPARTMENT BASED ON VP
       - Uses VP’s department when available
       - Falls back to manually provided department
       - Defaults to empty string
    --------------------------------------------------------- */

    const deptRecord = await db
      .collection("department")
      .findOne({ dept_no: vpValid.dept_no });

    const autoDept = deptRecord?.dept_name || requesting_dept || "";

    /* ---------------------------------------------------------
       BUILD INITIATIVE DOCUMENT
       - Prepares final structure for DB insertion
       - Includes timestamp for auditing
    --------------------------------------------------------- */

    const newInitiative = {
      project_name: project,
      category,
      leader: lead,
      status,
      requestor,
      requestor_vp,
      requesting_dept: autoDept,
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes: resource_consideration || "",
      created_at: new Date(),
    };

    /* ---------------------------------------------------------
       INSERT INTO DATABASE
       - Saves initiative into assignment collection
    --------------------------------------------------------- */

    const result = await db.collection("assignment").insertOne(newInitiative);

    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 200 }
    );

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs unexpected server errors
       - Returns generic failure response
    --------------------------------------------------------- */
    console.error("Add Initiative API error:", err);

    return NextResponse.json(
      { error: "Failed to add initiative" },
      { status: 500 }
    );
  }
}