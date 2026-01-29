import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'ResourceManagementAPP_DB';

let client = null;

/* ---------------------------------------------------------
   MONGODB CLIENT (Singleton)
   ---------------------------------------------------------
   PURPOSE:
   - Ensures only one MongoDB client instance is created
   - Prevents connection overload in serverless environments
--------------------------------------------------------- */
async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

/* ---------------------------------------------------------
   Convert YYYYMM → "Sep-25"
   ---------------------------------------------------------
   PURPOSE:
   - Converts numeric YYYYMM format into a readable label
   - Used for dropdown month labels on the frontend
--------------------------------------------------------- */
function formatMonthLabel(yyyymm) {
  const s = String(yyyymm);
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const date = new Date(year, month - 1, 1);

  const shortMonth = date.toLocaleString('en-US', { month: 'short' });
  const shortYear = String(year).slice(2);

  return `${shortMonth}-${shortYear}`;
}

/* ---------------------------------------------------------
   GET /months
   ---------------------------------------------------------
   PURPOSE:
   - Returns a list of all months present in either:
       → allocation collection
       → capacity collection
   - Ensures months are:
       → unique
       → sorted ascending
       → limited to the last 12 months
   - Formats each month into:
       { label: "Sep-25", value: 202509 }
--------------------------------------------------------- */
export async function GET() {
  try {
    const mongo = await getClient();
    const db = mongo.db(DB_NAME);

    const allocationCol = db.collection('allocation');
    const capacityCol = db.collection('capacity');

    /* ---------------------------------------------------------
       1) Pull all unique months from both collections
       ---------------------------------------------------------
       PURPOSE:
       - Some months may exist only in allocation or only in capacity
       - We merge both sets to build a complete month list
    --------------------------------------------------------- */
    const allocMonths = await allocationCol.distinct('date');
    const capMonths = await capacityCol.distinct('date');

    let allMonths = Array.from(new Set([...allocMonths, ...capMonths]));

    /* ---------------------------------------------------------
       2) Sort months ascending (YYYYMM numeric)
    --------------------------------------------------------- */
    allMonths.sort((a, b) => a - b);

    /* ---------------------------------------------------------
       3) Filter to last 12 months only
       ---------------------------------------------------------
       PURPOSE:
       - Prevents dropdown from becoming too long
       - Keeps UI focused on recent data
    --------------------------------------------------------- */
    const today = new Date();
    const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
    const oneYearAgo = currentYYYYMM - 100; // subtract 1 year

    allMonths = allMonths.filter((m) => m >= oneYearAgo && m <= currentYYYYMM);

    /* ---------------------------------------------------------
       4) Format for frontend dropdown
       ---------------------------------------------------------
       OUTPUT FORMAT:
       [
         { label: "Sep-25", value: 202509 },
         { label: "Oct-25", value: 202510 },
         ...
       ]
    --------------------------------------------------------- */
    const formatted = allMonths.map((m) => ({
      label: formatMonthLabel(m),
      value: m
    }));

    return NextResponse.json({ months: formatted });

  } catch (err) {
    console.error('Error in /months:', err);

    return NextResponse.json(
      { error: 'Failed to load months' },
      { status: 500 }
    );
  }
}