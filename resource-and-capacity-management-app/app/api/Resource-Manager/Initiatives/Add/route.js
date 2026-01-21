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
// POST /api/Resource-Manager/Initiatives/Add
// Creates a new initiative record in the database
// ---------------------------------------------------------
export async function POST(request) {
  try {
    const db = await connectDB();

    // Extract JSON body from request
    const body = await request.json();

    // Destructure expected fields
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

    // ---------------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ---------------------------------------------------------

    /**
     * Required fields for all initiatives.
     * - completion_date is validated separately when status = Completed
     */
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

    // Loop through required fields and validate non-empty values
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return NextResponse.json(
          { error: `${key.replace(/_/g, " ")} is required.` },
          { status: 400 }
        );
      }
    }

    // Additional rule: Completed initiatives MUST include a completion date
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

    // ---------------------------------------------------------
    // USER VALIDATION HELPERS
    // ---------------------------------------------------------

    /**
     * Validates a user by:
     * - Matching ANY of the allowed account types (accTypes array)
     * - Joining employee info via emp_id
     * - Matching employee name exactly
     *
     * Returns:
     * - employee_info object if valid
     * - null if no match found
     */
    const validateUser = async (name, accTypes) => {
      const result = await db
        .collection("account")
        .aggregate([
          { $match: { "account.acc_type_id": { $in: accTypes } } }, // Accept multiple account types
          {
            $lookup: {
              from: "employee", // Join employee collection
              localField: "emp_id",
              foreignField: "emp_id",
              as: "employee_info",
            },
          },
          { $unwind: "$employee_info" }, // Flatten joined array
          { $match: { "employee_info.emp_name": name } }, // Match by employee name
        ])
        .toArray();

      return result.length > 0 ? result[0].employee_info : null;
    };

    // Validate Lead (must be account type 1 only)
    const leadValid = await validateUser(lead, [1]);
    if (!leadValid) {
      return NextResponse.json(
        { error: `Lead "${lead}" is not a valid Resource Manager.` },
        { status: 400 }
      );
    }

    // Validate Requestor (allowed: acc_type_id 1 or 2)
    const requestorValid = await validateUser(requestor, [1, 2]);
    if (!requestorValid) {
      return NextResponse.json(
        { error: `Requestor "${requestor}" is not authorized.` },
        { status: 400 }
      );
    }

    // Validate Requestor VP (allowed: acc_type_id 1 or 2)
    const vpValid = await validateUser(requestor_vp, [1, 2]);
    if (!vpValid) {
      return NextResponse.json(
        { error: `Requestor VP "${requestor_vp}" is not authorized.` },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // AUTO-ASSIGN DEPARTMENT BASED ON VP
    // ---------------------------------------------------------

    /**
     * Department is determined by:
     * - VP's department (preferred)
     * - OR manually provided requesting_dept
     * - OR empty string fallback
     */
    const deptRecord = await db
      .collection("department")
      .findOne({ dept_no: vpValid.dept_no });

    const autoDept = deptRecord?.dept_name || requesting_dept || "";

    // ---------------------------------------------------------
    // BUILD INITIATIVE DOCUMENT
    // ---------------------------------------------------------

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
      created_at: new Date(), // Timestamp for auditing
    };

    // ---------------------------------------------------------
    // INSERT INTO DATABASE
    // ---------------------------------------------------------

    const result = await db.collection("assignment").insertOne(newInitiative);

    return NextResponse.json(
      { success: true, insertedId: result.insertedId },
      { status: 200 }
    );
  } catch (err) {
    console.error("Add Initiative API error:", err);

    return NextResponse.json(
      { error: "Failed to add initiative" },
      { status: 500 }
    );
  }
}