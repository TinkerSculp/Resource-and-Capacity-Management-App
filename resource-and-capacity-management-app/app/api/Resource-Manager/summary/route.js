import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/* ---------------------------------------------------------
   MongoDB Connection Setup (Native Driver)
   ---------------------------------------------------------
   - Uses a single shared MongoClient instance
   - Prevents multiple connections during hot reloads
   - Ensures efficient, reusable database access
--------------------------------------------------------- */

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

/**
 * Ensures a single, reusable MongoDB connection.
 * - Avoids creating new connections on every request
 * - Returns the active database instance
 */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("✅ Connected to MongoDB (Summary API)");
  }
  return client.db();
}

/* ---------------------------------------------------------
   GET /api/Resource-Manager/summary
   ---------------------------------------------------------
   Purpose:
   - Returns initiative counts for dashboard summary cards
   - Supports two modes:
       1. filter=all   → counts all initiatives
       2. filter=mine  → counts initiatives led by the logged‑in user

   How "Mine" Works:
   - Uses username → account lookup
   - Retrieves emp_id from account
   - Uses emp_id → employee lookup
   - Extracts employee.emp_name
   - Filters assignments where leader === emp_name
--------------------------------------------------------- */

export async function GET(req) {
  try {
    const db = await connectDB();
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const filter = searchParams.get("filter");
    const username = searchParams.get("username");

    // Base MongoDB query object (modified only for "mine")
    let baseQuery = {};

    /* -----------------------------------------------------
       MINE FILTER LOGIC
       -----------------------------------------------------
       - Converts username → emp_id → emp_name
       - Uses emp_name as the "leader" filter
       - Ensures only initiatives owned by the user are counted
    ----------------------------------------------------- */
    if (filter === "mine" && username) {
      // 1. Look up account by username
      const accountDoc = await db.collection("account").findOne({
        "account.username": username.trim()
      });

      // If no account found, return empty summary
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

      // If no employee found, return empty summary
      if (!employee) {
        return NextResponse.json({
          backlog: 0,
          active: 0,
          planned: 0,
          hold: 0
        });
      }

      // 3. Apply leader filter using employee full name
      baseQuery.leader = employee.emp_name;
    }

    /* -----------------------------------------------------
       INITIATIVE COUNTS
       -----------------------------------------------------
       - Queries the assignment collection
       - Applies baseQuery (empty for "all", filtered for "mine")
       - Counts initiatives by status category
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Response Payload
       -----------------------------------------------------
       - Returns structured summary counts
       - Used by dashboard summary cards
    ----------------------------------------------------- */
    return NextResponse.json({
      backlog,
      active,
      planned,
      hold
    });

  } catch (err) {
    // Catch unexpected server errors
    console.error("🔥 Summary API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}