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
   GET /api/Resource-Manager/Initiatives/GetOne
   - Fetches a single initiative by its MongoDB _id
   - Used by Edit Initiative modal to pre-fill form fields
--------------------------------------------------------- */
export async function GET(request) {
  try {
    const db = await connectDB();

    // Extract query parameters from request URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    /* ---------------------------------------------------------
       VALIDATE REQUIRED PARAMETER
       - Initiative ID must be provided
    --------------------------------------------------------- */
    if (!id) {
      return NextResponse.json(
        { error: "Missing initiative ID" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       LOOKUP INITIATIVE BY _id
       - Converts string → ObjectId
       - Queries assignment collection for matching record
    --------------------------------------------------------- */
    const data = await db
      .collection("assignment")
      .findOne({ _id: new ObjectId(id) });

    // If no matching initiative found
    if (!data) {
      return NextResponse.json(
        { error: "Initiative not found" },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------
       SUCCESS RESPONSE
       - Returns full initiative document
       - Used to populate Edit Initiative form
    --------------------------------------------------------- */
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    /* ---------------------------------------------------------
       ERROR HANDLING
       - Logs unexpected server errors
       - Returns generic failure response
    --------------------------------------------------------- */
    console.error("GetOne API error:", err);

    return NextResponse.json(
      { error: "Failed to load initiative" },
      { status: 500 }
    );
  }
}