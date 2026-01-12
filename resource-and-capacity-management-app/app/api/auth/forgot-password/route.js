import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// -------------------------------
// CONNECT TO MONGODB
// -------------------------------
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
        console.log("✅ Connected to MongoDB (Native Driver)");
    }
    return client.db(); // return the database instance
}

// -------------------------------
// POST /api/auth/forgot-password
// -------------------------------
export async function POST(req) {
    console.log("🔔 Forgot password route triggered");

    try {
        const db = await connectDB();
        const body = await req.json();
        const { username } = body;

        console.log("📩 Received username:", username);

        if (!username) {
            console.log("❌ No username provided");
            return NextResponse.json({
                success: false,
                message: "Username missing"
            });
        }

        const normalized = username.trim().toLowerCase();
        console.log("🔍 Normalized username:", normalized);

        // Query the 'account' collection using native MongoDB
        const user = await db.collection('account').findOne({
            'account.username': { $regex: `^${normalized}$`, $options: 'i' }
        });

        console.log("📊 MongoDB lookup result:", user);

        if (!user) {
            console.log("❌ Username not found in DB");
            return NextResponse.json({
                success: false,
                message: "Username not found"
            });
        }

        console.log("✅ Username found:", user.username);

        // -------------------------------
        // EMAIL SENDING (COMMENTED OUT)
        // -------------------------------
        /*
        await sendResetEmail({
            to: user.email,
            username: user.username,
            resetLink: `https://yourapp.com/reset-password/${user._id}`
        });
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