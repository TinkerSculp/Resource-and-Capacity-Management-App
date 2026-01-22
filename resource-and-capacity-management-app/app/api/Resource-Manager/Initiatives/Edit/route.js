import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

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
   PUT /api/Resource-Manager/Initiatives/Edit
   - Updates an existing initiative record
   - Validates required fields
   - Validates requestor + VP existence
   - Auto‑assigns department based on VP
   - Saves updated record to database
--------------------------------------------------------- */
export async function PUT(request) {
  try {
    const db = await connectDB();

    // Parse incoming JSON payload
    const body = await request.json();

    // Extract expected fields
    const {
      id,
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
       BASIC VALIDATION
       - Initiative ID must be provided
       - Required fields must contain non‑empty values
       - completion_date required when status = Completed
    --------------------------------------------------------- */

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

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

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return NextResponse.json(
          { error: `${key.replace(/_/g, " ")} is required.` },
          { status: 400 }
        );
      }
    }

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
       REQUESTOR VALIDATION
       - Ensures Requestor exists in employee collection
       - Ensures Requestor VP exists in employee collection
       - Matches by exact employee name
    --------------------------------------------------------- */

    const requestorEmployee = await db
      .collection("employee")
      .findOne({ emp_name: requestor });

    if (!requestorEmployee) {
      return NextResponse.json(
        { error: `Requestor "${requestor}" does not exist.` },
        { status: 400 }
      );
    }

    const vpEmployee = await db
      .collection("employee")
      .findOne({ emp_name: requestor_vp });

    if (!vpEmployee) {
      return NextResponse.json(
        { error: `Requestor VP "${requestor_vp}" does not exist.` },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       AUTO‑POPULATE DEPARTMENT BASED ON VP
       - Uses VP’s department when available
       - Falls back to empty string
    --------------------------------------------------------- */

    const deptRecord = await db
      .collection("department")
      .findOne({ dept_no: vpEmployee.dept_no });

    const autoDept = deptRecord?.dept_name || "";

    /* ---------------------------------------------------------
       BUILD UPDATE DOCUMENT
       - Prepares final structure for DB update
       - Includes timestamp for auditing
    --------------------------------------------------------- */

    const updated = {
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
      updated_at: new Date(),
    };

    /* ---------------------------------------------------------
       UPDATE INITIATIVE IN DATABASE
       - Uses _id to locate record
       - Applies $set to update fields
    --------------------------------------------------------- */

    await db
      .collection("assignment")
      .updateOne({ _id: new ObjectId(id) }, { $set: updated });

    return NextResponse.json({ success: true });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs unexpected server errors
       - Returns generic failure response
    --------------------------------------------------------- */
    console.error("Edit Initiative API error:", err);

    return NextResponse.json(
      { error: "Failed to update initiative" },
      { status: 500 }
    );
  }
}