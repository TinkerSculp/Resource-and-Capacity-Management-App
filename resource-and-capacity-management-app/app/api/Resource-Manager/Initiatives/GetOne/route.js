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
// GET /api/Resource-Manager/Initiatives/GetOne
// Fetches a single initiative by its MongoDB _id
// ---------------------------------------------------------
export async function GET(request) {
  try {
    const db = await connectDB();

    // Extract query parameters from request URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // ---------------------------------------------------------
    // VALIDATE REQUIRED PARAMETER
    // ---------------------------------------------------------
    if (!id) {
      return NextResponse.json(
        { error: "Missing initiative ID" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // LOOKUP INITIATIVE BY _id
    // ---------------------------------------------------------
    /**
     * Convert string ID → ObjectId
     * Query the "assignment" collection for a matching document
     */
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

    // ---------------------------------------------------------
    // SUCCESS RESPONSE
    // ---------------------------------------------------------
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error("GetOne API error:", err);

    return NextResponse.json(
      { error: "Failed to load initiative" },
      { status: 500 }
    );
  }
}