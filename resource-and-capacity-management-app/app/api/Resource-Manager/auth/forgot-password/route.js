import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/* ---------------------------------------------------------
   MONGODB CONNECTION SETUP
   - Loads connection string from environment
   - Reuses a single MongoDB client instance
   - Prevents duplicate connections during hot reloads
--------------------------------------------------------- */

// Connection string from environment variables
const uri = process.env.MONGODB_URI;

// Shared MongoDB client instance
const client = new MongoClient(uri);

/* ---------------------------------------------------------
   CONNECT TO DATABASE
   - Opens a connection only if not already connected
   - Ensures stable DB access across API calls
   - Returns active database instance
--------------------------------------------------------- */
async function connectDB() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
        console.log("Connected to MongoDB (Native Driver)");
    }

    return client.db(); // Uses default DB from connection string
}

/* ---------------------------------------------------------
   POST /api/Resource-Manager/auth/forgot-password
   - Validates whether a username exists in the system
   - First step of password reset workflow
   - Does NOT send email yet (placeholder only)
--------------------------------------------------------- */
export async function POST(req) {
    console.log("Forgot password route triggered");

    try {
        const db = await connectDB();

        // Parse incoming JSON body
        const body = await req.json();
        const { username } = body;

        console.log("Received username:", username);

        /* ---------------------------------------------------------
           BASIC INPUT VALIDATION
           - Username must be provided
        --------------------------------------------------------- */
        if (!username) {
            console.log("No username provided");
            return NextResponse.json({
                success: false,
                message: "Username missing"
            });
        }

        /* ---------------------------------------------------------
           NORMALIZE INPUT
           - Trim whitespace only
           - No lowercase conversion
           - Enforces strict, exact match
        --------------------------------------------------------- */
        const normalized = username.trim();
        console.log("Normalized username:", normalized);

        /* ---------------------------------------------------------
           LOOKUP USER IN DATABASE
           - Exact match on account.username
           - No regex or case-insensitive search
        --------------------------------------------------------- */
        const user = await db.collection('account').findOne({
            'account.username': normalized
        });

        console.log("MongoDB lookup result:", user);

        // Username not found
        if (!user) {
            console.log("Username not found in DB");
            return NextResponse.json({
                success: false,
                message: "Username not found"
            });
        }

        console.log("Username found:", user.account?.username);

        /* ---------------------------------------------------------
           EMAIL RESET PLACEHOLDER
           - Future implementation will:
             • Generate secure reset token
             • Store token + expiration
             • Email reset link to user
        --------------------------------------------------------- */

        return NextResponse.json({
            success: true,
            message: "Reset instructions sent"
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return NextResponse.json({
            success: false,
            message: "Server error"
        });
    }
}