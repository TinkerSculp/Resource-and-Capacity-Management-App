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
   - Used for chart/table month headers on the frontend
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
   Compute rolling window of months
   ---------------------------------------------------------
   PURPOSE:
   - Generates a sequential list of YYYYMM values
   - Example: start=202501, count=6 → [202501, 202502, ...]
--------------------------------------------------------- */
function computeMonthWindow(startYYYYMM, count) {
  const months = [];
  let year = Math.floor(startYYYYMM / 100);
  let month = startYYYYMM % 100;

  for (let i = 0; i < count; i++) {
    months.push(year * 100 + month);
    month++;

    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const startParam = searchParams.get('start');
    const monthsParam = searchParams.get('months');

    const startMonth = startParam ? parseInt(startParam, 10) : null;
    const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6;

    const mongo = await getClient();
    const db = mongo.db(DB_NAME);

    const allocationCol = db.collection('allocation');
    const capacityCol = db.collection('capacity');

    /* ---------------------------------------------------------
       AUTO-DETECT START MONTH (if not provided)
       ---------------------------------------------------------
       PURPOSE:
       - Finds all months present in allocation + capacity collections
       - Chooses the closest month <= current month
       - Ensures the graph always starts at a valid month
    --------------------------------------------------------- */
    let start = startMonth;

    if (!start) {
      const allMonths = await capacityCol.distinct('date');
      const allocMonths = await allocationCol.distinct('date');

      const combined = Array.from(new Set([...allMonths, ...allocMonths]));
      combined.sort((a, b) => a - b);

      const today = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

      const valid = combined.filter((m) => m <= currentYYYYMM);
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    const targetMonths = computeMonthWindow(start, monthsWindow);

    /* ---------------------------------------------------------
       1) AGGREGATE ALLOCATIONS BY CATEGORY + MONTH
       ---------------------------------------------------------
       PURPOSE:
       - Sums allocation amounts grouped by:
         → category (Vacation, Baseline, etc.)
         → month (YYYYMM)
       - Produces structure:
         [
           { _id: 202501, categories: [ {category:'Vacation', total:10}, ... ] }
         ]
    --------------------------------------------------------- */
    const allocationAgg = await allocationCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } },
        {
          $group: {
            _id: { category: '$category', date: '$date' },
            total: { $sum: '$amount' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            categories: {
              $push: {
                category: '$_id.category',
                total: '$total'
              }
            }
          }
        }
      ])
      .toArray();

    /* ---------------------------------------------------------
       2) AGGREGATE PEOPLE CAPACITY BY MONTH
       ---------------------------------------------------------
       PURPOSE:
       - Sums all capacity entries for each month
       - Produces structure:
         [
           { _id: 202501, totalPeopleCapacity: 42 }
         ]
    --------------------------------------------------------- */
    const capacityAgg = await capacityCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } },
        {
          $group: {
            _id: '$date',
            totalPeopleCapacity: { $sum: '$amount' }
          }
        }
      ])
      .toArray();

    const capacityMap = new Map();
    for (const row of capacityAgg) {
      capacityMap.set(row._id, row.totalPeopleCapacity);
    }

    /* ---------------------------------------------------------
       3) MERGE ALLOCATION + CAPACITY RESULTS
       ---------------------------------------------------------
       PURPOSE:
       - Ensures every month in the window has:
         → category totals
         → total allocated
         → total people capacity
         → remaining capacity
       - Normalizes category names to 4 fixed buckets
    --------------------------------------------------------- */
    const merged = [];

    for (const month of targetMonths) {
      const allocRow = allocationAgg.find((r) => r._id === month);

      const catTotals = {
        Vacation: 0,
        Baseline: 0,
        Strategic: 0,
        'Discretionary Project': 0
      };

      if (allocRow) {
        for (const c of allocRow.categories) {
          let label = c.category;

          // Normalize category names
          if (label.includes('Vacation')) label = 'Vacation';
          if (label.includes('Baseline')) label = 'Baseline';
          if (label.includes('Strategic')) label = 'Strategic';
          if (label.includes('Discretionary')) label = 'Discretionary Project';

          if (catTotals[label] !== undefined) {
            catTotals[label] += c.total;
          }
        }
      }

      const totalAllocated =
        catTotals.Vacation +
        catTotals.Baseline +
        catTotals.Strategic +
        catTotals['Discretionary Project'];

      const totalPeopleCapacity = capacityMap.get(month) ?? 0;

      merged.push({
        date: month,
        categories: catTotals,
        totalAllocated,
        totalPeopleCapacity,
        remainingCapacity: totalPeopleCapacity - totalAllocated
      });
    }

    /* ---------------------------------------------------------
       4) FORMAT RESPONSE FOR FRONTEND
       ---------------------------------------------------------
       PURPOSE:
       - Converts merged data into chart/table-friendly format
       - Ensures consistent ordering of categories
       - Converts YYYYMM → "MMM-YY"
    --------------------------------------------------------- */
    return NextResponse.json({
      months: merged.map((m) => formatMonthLabel(m.date)),
      categories: [
        { label: 'Vacation', values: merged.map((m) => m.categories.Vacation) },
        { label: 'Baseline', values: merged.map((m) => m.categories.Baseline) },
        { label: 'Strategic', values: merged.map((m) => m.categories.Strategic) },
        {
          label: 'Discretionary Project',
          values: merged.map((m) => m.categories['Discretionary Project'])
        }
      ],
      totals: merged.map((m) => m.totalAllocated),
      peopleCapacity: merged.map((m) => m.totalPeopleCapacity),
      remainingCapacity: merged.map((m) => m.remainingCapacity)
    });

  } catch (err) {
    console.error('Error in capacity-summary:', err);

    return NextResponse.json(
      { error: 'Failed to load capacity summary' },
      { status: 500 }
    );
  }
}