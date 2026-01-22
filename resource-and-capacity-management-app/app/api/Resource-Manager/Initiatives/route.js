/* ---------------------------------------------------------
   IMPORTS & DATABASE CLIENT SETUP
   - NextResponse: used to return API responses in Next.js
   - MongoClient: used to connect to MongoDB Atlas
   - uri: connection string stored in environment variables
   - client: reusable MongoDB client instance
--------------------------------------------------------- */
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   DATABASE CONNECTION HANDLER
   - Ensures a single MongoDB connection is reused
   - Prevents multiple connections during hot reload
   - Returns the active database instance
   - Database name: ResourceManagementAPP_DB
--------------------------------------------------------- */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB (assignment)");
  }
  return client.db("ResourceManagementAPP_DB");
}

/* ---------------------------------------------------------
   GET: FETCH ASSIGNMENTS WITH RELATIONAL LOOKUPS
   - Retrieves all assignment records
   - Performs two relational lookups:
       1. requestor_vp → employee.emp_name
       2. employee.dept_no → department.dept_no
   - Returns a fully enriched dataset to the frontend
   - ALSO resolves "My Initiatives" when username is provided

   Pipeline Steps:
   1. Lookup VP employee record
   2. Lookup department for that employee
   3. Project final fields into clean output format

   Output Fields:
   - project_name
   - category
   - leader
   - status
   - requestor
   - requestor_vp
   - requesting_dept
   - target_period
   - completion_date
   - description
   - resource_notes
--------------------------------------------------------- */
export async function GET(request) {
  try {
    const db = await connectDB();

    /* ---------------------------------------------------------
       OPTIONAL: USERNAME FOR "MY INITIATIVES"
       - If provided, backend will also return initiatives
         where the logged-in user is the leader.
    --------------------------------------------------------- */
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    /* ---------------------------------------------------------
       FETCH ALL ASSIGNMENTS (WITH LOOKUPS)
       - Joins VP → employee → department
       - Produces enriched assignment objects
    --------------------------------------------------------- */
    const allAssignments = await db.collection("assignment").aggregate([
      {
        $lookup: {
          from: "employee",
          localField: "requestor_vp",
          foreignField: "emp_name",
          as: "vp_employee"
        }
      },
      { $unwind: { path: "$vp_employee", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "department",
          localField: "vp_employee.dept_no",
          foreignField: "dept_no",
          as: "vp_department"
        }
      },
      { $unwind: { path: "$vp_department", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          project_name: 1,
          category: 1,
          leader: 1,
          status: 1,
          requestor: 1,
          requestor_vp: 1,
          requesting_dept: "$vp_department.dept_name",
          target_period: 1,
          completion_date: 1,
          description: 1,
          resource_notes: 1
        }
      }
    ]).toArray();

    /* ---------------------------------------------------------
       RESOLVE "MY INITIATIVES" (IF USERNAME PROVIDED)
       ERD Chain:
       1. account.username → emp_id
       2. employee.emp_id → emp_name
       3. assignment.leader === emp_name
    --------------------------------------------------------- */
    let myInitiatives = [];

    if (username) {
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        const employee = await db.collection("employee").findOne({
          emp_id: account.emp_id
        });

        if (employee) {
          myInitiatives = allAssignments.filter(
            (i) => i.leader === employee.emp_name && i.status !== "Completed"
          );
        }
      }
    }

    /* ---------------------------------------------------------
       SUCCESS RESPONSE
       - Returns both:
         1. allAssignments → full dataset
         2. myInitiatives → filtered by logged-in user
    --------------------------------------------------------- */
    return NextResponse.json({
      allAssignments,
      myInitiatives
    });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs server-side error
       - Returns 500 response to frontend
    --------------------------------------------------------- */
    console.error("Assignment API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}