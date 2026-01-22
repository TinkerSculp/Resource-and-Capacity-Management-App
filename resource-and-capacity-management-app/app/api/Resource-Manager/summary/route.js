import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/* ---------------------------------------------------------
   MONGODB CONNECTION SETUP
   - Loads connection string from environment
   - Reuses a single MongoClient instance
   - Prevents duplicate connections during hot reloads
--------------------------------------------------------- */

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   CONNECT TO DATABASE
   - Opens a connection only if not already active
   - Ensures stable DB access across API calls
   - Returns active database instance
--------------------------------------------------------- */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB (Summary API)");
  }
  return client.db(); // Uses default DB from connection string
}

/* ---------------------------------------------------------
   GET /api/Resource-Manager/summary
   ---------------------------------------------------------
   PURPOSE:
   - Returns initiative counts for dashboard summary cards

   SUPPORTED MODES:
   - filter=all   → counts all initiatives
   - filter=mine  → counts initiatives led by the logged‑in user

   HOW "MINE" MODE WORKS:
   - username → account lookup
   - account.emp_id → employee lookup
   - employee.emp_name → used as leader filter
   - Only initiatives where leader === emp_name are counted
--------------------------------------------------------- */

export async function GET(req) {
  try {
    const db = await connectDB();
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const filter = searchParams.get("filter");
    const username = searchParams.get("username");

    // Base query (modified only when filter=mine)
    let baseQuery = {};

    /* ---------------------------------------------------------
       MINE FILTER LOGIC
       - Converts username → emp_id → emp_name
       - Applies leader filter for user-owned initiatives
       - Returns empty summary if user cannot be resolved
    --------------------------------------------------------- */
    if (filter === "mine" && username) {
      // 1. Look up account by username
      const accountDoc = await db.collection("account").findOne({
        "account.username": username.trim()
      });

      if (!accountDoc) {
        return NextResponse.json({
          backlog: 0,
          active: 0,
          planned: 0,
          hold: 0
        });
      }

      // 2. Look up employee using emp_id
      const employee = await db.collection("employee").findOne({
        emp_id: accountDoc.emp_id
      });

      if (!employee) {
        return NextResponse.json({
          backlog: 0,
          active: 0,
          planned: 0,
          hold: 0
        });
      }

      // 3. Apply leader filter
      baseQuery.leader = employee.emp_name;
    }

    /* ---------------------------------------------------------
       INITIATIVE COUNTS
       - Applies baseQuery (empty for "all", filtered for "mine")
       - Counts initiatives by status category
    --------------------------------------------------------- */

    const backlog = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: "Backlog"
    });

    const active = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: { $in: ["On Going", "In Progress"] }
    });

    const planned = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: "Planned"
    });

    const hold = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: "On Hold"
    });

    /* ---------------------------------------------------------
       RESPONSE PAYLOAD
       - Structured summary counts for dashboard cards
    --------------------------------------------------------- */
    return NextResponse.json({
      backlog,
      active,
      planned,
      hold
    });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Catches unexpected server errors
       - Returns generic error response
    --------------------------------------------------------- */
    console.error("Summary API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}