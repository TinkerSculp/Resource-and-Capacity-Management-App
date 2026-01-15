import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// ---------------------------------------------------------
// MONGODB CONNECTION SETUP (Native Driver)
// ---------------------------------------------------------

// Connection string loaded from environment variables
const uri = process.env.MONGODB_URI;

// Create a reusable MongoDB client instance
const client = new MongoClient(uri);

/**
 * Establishes a connection to MongoDB using the native driver.
 * - Reuses the existing connection if already open
 * - Prevents multiple connections during hot reloads in dev mode
 * - Returns the active database instance
 */
async function connectDB() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
        console.log("✅ Connected to MongoDB (Native Driver)");
    }

    return client.db(); // Return active DB instance
}

// ---------------------------------------------------------
// POST /api/Resource-Manager/auth/forgot-password
// Validates username for password reset requests
// ---------------------------------------------------------
export async function POST(req) {
    console.log("🔔 Forgot password route triggered");

    try {
        const db = await connectDB();

        // Extract JSON body from request
        const body = await req.json();
        const { username } = body;

        console.log("📩 Received username:", username);

        // Ensure username was provided
        if (!username) {
            console.log("❌ No username provided");
            return NextResponse.json({
                success: false,
                message: "Username missing"
            });
        }

        /**
         * Normalize input:
         * - Only trimming whitespace
         * - NO lowercase conversion
         * - NO case-insensitive matching
         *
         * This enforces strict matching:
         * User must type the username EXACTLY as stored in DB.
         */
        const normalized = username.trim();
        console.log("🔍 Normalized username:", normalized);

        /**
         * Query the `account` collection using strict equality.
         * - No regex
         * - No case-insensitive flags
         * - No transformations
         *
         * Your DB stores usernames inside:
         *   account.username
         *
         * This lookup requires an exact match.
         */
        const user = await db.collection('account').findOne({
            'account.username': normalized
        });

        console.log("📊 MongoDB lookup result:", user);

        // Username not found
        if (!user) {
            console.log("❌ Username not found in DB");
            return NextResponse.json({
                success: false,
                message: "Username not found"
            });
        }

        console.log("✅ Username found:", user.account?.username);

        // ---------------------------------------------------------
        // EMAIL SENDING (Future Implementation Placeholder)
        // ---------------------------------------------------------
        /**
         * When implementing email delivery:
         * - Generate a secure reset token
         * - Store token + expiration in DB
         * - Email the user a reset link containing the token
         */

        return NextResponse.json({
            success: true,
            message: "Reset instructions sent"
        });

    } catch (error) {
        console.error("🔥 Forgot password error:", error);

        return NextResponse.json({
            success: false,
            message: "Server error"
        });
    }
}