import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

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
// PUT /api/Resource-Manager/Initiatives/Edit
// Updates an existing initiative record
// ---------------------------------------------------------
export async function PUT(request) {
  try {
    const db = await connectDB();

    // Extract JSON body from request
    const body = await request.json();

    // Destructure expected fields
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

    // ---------------------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------------------

    // Initiative ID must be provided
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    /**
     * Required fields for all initiatives.
     * - completion_date validated separately when status = Completed
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

    // Validate non-empty required fields
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
    // REQUESTOR VALIDATION
    // ---------------------------------------------------------

    /**
     * Validate Requestor:
     * - Must exist in the employee collection
     * - Name must match exactly
     */
    const requestorEmployee = await db
      .collection("employee")
      .findOne({ emp_name: requestor });

    if (!requestorEmployee) {
      return NextResponse.json(
        { error: `Requestor "${requestor}" does not exist.` },
        { status: 400 }
      );
    }

    /**
     * Validate Requestor VP:
     * - Must also exist in employee collection
     */
    const vpEmployee = await db
      .collection("employee")
      .findOne({ emp_name: requestor_vp });

    if (!vpEmployee) {
      return NextResponse.json(
        { error: `Requestor VP "${requestor_vp}" does not exist.` },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // AUTO-POPULATE DEPARTMENT BASED ON VP
    // ---------------------------------------------------------

    /**
     * Department is determined by:
     * - VP's department (preferred)
     * - OR empty string fallback
     */
    const deptRecord = await db
      .collection("department")
      .findOne({ dept_no: vpEmployee.dept_no });

    const autoDept = deptRecord?.dept_name || "";

    // ---------------------------------------------------------
    // BUILD UPDATE DOCUMENT
    // ---------------------------------------------------------

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
      updated_at: new Date(), // Timestamp for auditing
    };

    // ---------------------------------------------------------
    // UPDATE INITIATIVE IN DATABASE
    // ---------------------------------------------------------

    await db
      .collection("assignment")
      .updateOne({ _id: new ObjectId(id) }, { $set: updated });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Edit Initiative API error:", err);

    return NextResponse.json(
      { error: "Failed to update initiative" },
      { status: 500 }
    );
  }
}