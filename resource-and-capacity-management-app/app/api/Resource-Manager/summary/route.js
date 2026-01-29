import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/* ---------------------------------------------------------
   MONGODB CONNECTION SETUP
--------------------------------------------------------- */

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   CONNECT TO DATABASE
--------------------------------------------------------- */
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log("Connected to MongoDB (Summary API)");
  }
  return client.db();
}

/* ---------------------------------------------------------
   GET /api/Resource-Manager/summary
--------------------------------------------------------- */
export async function GET(req) {
  try {
    const db = await connectDB();
    const { searchParams } = new URL(req.url);

    const filter = searchParams.get("filter");
    const username = searchParams.get("username");

    let baseQuery = {};

    /* ---------------------------------------------------------
       MINE FILTER LOGIC
    --------------------------------------------------------- */
    if (filter === "mine" && username) {
      const accountDoc = await db.collection("account").findOne({
        "account.username": username.trim()
      });

      if (!accountDoc) {
        return NextResponse.json({
          backlog: 0,
          active: 0,
          hold: 0
        });
      }

      const employee = await db.collection("employee").findOne({
        emp_id: accountDoc.emp_id
      });

      if (!employee) {
        return NextResponse.json({
          backlog: 0,
          active: 0,
          hold: 0
        });
      }

      baseQuery.leader = employee.emp_name;
    }

    /* ---------------------------------------------------------
       INITIATIVE COUNTS (Planned Removed)
    --------------------------------------------------------- */

    const backlog = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: "Backlog"
    });

    const active = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: { $in: ["On Going", "In Progress"] }
    });

    const hold = await db.collection("assignment").countDocuments({
      ...baseQuery,
      status: "On Hold"
    });

    /* ---------------------------------------------------------
       RESPONSE PAYLOAD (Planned Removed)
    --------------------------------------------------------- */
    return NextResponse.json({
      backlog,
      active,
      hold
    });

  } catch (err) {
    console.error("Summary API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}