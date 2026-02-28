import { connectDB } from "../config/db.js";
import { formatMonthLabel, computeMonthWindow } from "./capacitySummaryController.js";

export const getActivitySummary = async (req, res) => {
  try {
    const db = await connectDB();
    const allocationCol = db.collection("allocation");
    const { start, months, category, leader, dept, requestor, requestor_vp } = req.query;

    const monthsWindow = months ? parseInt(months, 10) : 6;

    if (!start) {
      const allocMonths = await allocationCol.distinct("date");
      allocMonths.sort((a, b) => a - b);

      const today = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

      const valid = allocMonths.filter((m) => m <= currentYYYYMM);
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    const targetMonths = computeMonthWindow(start, monthsWindow);

    const pipeline = [];

    const initialMatch = { date: { $in: targetMonths } };
    if (category && category !== "all") {
      initialMatch.category = category;
    }
    pipeline.push({ $match: initialMatch });

    pipeline.push(
      {
        $lookup: {
          from: "assignment",
          localField: "activity",
          foreignField: "project_name",
          as: "projectDetails",
        },
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    const assignmentFilters = {};
    if (leader && leader !== "all") assignmentFilters["projectDetails.leader"] = leader;
    if (dept && dept !== "all") assignmentFilters["projectDetails.requesting_dept"] = dept;
    if (requestor && requestor !== "all") assignmentFilters["projectDetails.requestor"] = requestor;
    if (requestor_vp && requestor_vp !== "all") assignmentFilters["projectDetails.requestor_vp"] = requestor_vp;

    if (Object.keys(assignmentFilters).length > 0) {
      pipeline.push({ $match: assignmentFilters });
    }

    pipeline.push(
      {
        $group: {
          _id: { activity: "$activity", date: "$date" },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: "$_id.activity",
          monthlyTotals: {
            $push: { date: "$_id.date", amount: "$totalAmount" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          activity: "$_id",
          monthlyTotals: 1,
        },
      },
      { $sort: { activity: 1 } },
    );

    const rawData = await allocationCol.aggregate(pipeline).toArray();

    const result = rawData.map((row) => {
      const monthMap = {};

      // Initialize all months with 0
      targetMonths.forEach((m) => {
        const label = formatMonthLabel(m);
        monthMap[label] = 0;
      });

      // Fill actual values
      row.monthlyTotals.forEach((m) => {
        const label = formatMonthLabel(m.date);
        monthMap[label] = m.amount;
      });

      return {
        activity: row.activity,
        months: monthMap,
      };
    });

    const formattedMonths = targetMonths.map((m) => formatMonthLabel(m));

    res.status(200).json({
      months: formattedMonths,
      data: result,
    });
  } catch (err) {
    console.error("Error in getActivitySummary:", err);
    res.status(500).json({ error: "Fail to load activity allocation summary" });
  }
};

// Get Activity Filters
export const getActivityFilters = async (req, res) => {
  try {
    const db = await connectDB();

    const [leadersResult, requestors, requestor_vp, departments] = await Promise.all([
      db.collection("account").aggregate([
        { $match: { "account.acc_type_id": 1 } },
        {
          $lookup: {
            from: "employee",
            localField: "emp_id",
            foreignField: "emp_id",
            as: "emp_details"
          }
        },
        { $unwind: "$emp_details" },
        { $group: { _id: "$emp_details.emp_name" } },
        { $sort: { _id: 1 } }
      ]).toArray(),

      db.collection("assignment").distinct("requestor", {
        requestor: { $exists: true, $ne: "" },
      }),

      db.collection("assignment").distinct("requestor_vp", {
        requestor_vp: { $exists: true, $ne: "" },
      }),

      db.collection("department").distinct("dept_name", {
        dept_name: { $exists: true, $ne: "" }
      })
    ]);

    return res.json({
      leaders: leadersResult.map(l => l._id),
      requestors,
      requestor_vp,
      requesting_dept: departments.sort(),
    });

  } catch (error) {
    console.error("get-activity-filters error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getEmployeeCapacity = async (req, res) => {
  try {
    const db = await connectDB();
    const startParam = req.query.start;
    const monthsParam = req.query.months;

    const startMonth = startParam ? parseInt(startParam, 10) : 202501;
    const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6;
    const targetMonths = computeMonthWindow(startMonth, monthsWindow);

    const pipeline = [
      {
        $lookup: {
          from: "allocation",
          let: { empId: "$emp_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$emp_id", "$$empId"] }, { $in: ["$date", targetMonths] }],
                },
              },
            },
            {
              $group: {
                _id: "$date",
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          as: "monthlyData",
        },
      },
      {
        $project: {
          _id: 0,
          emp_name: 1,
          emp_id: 1,
          capacities: {
            $map: {
              input: "$monthlyData",
              as: "cap",
              in: {
                date: "$$cap._id",
                amount: "$$cap.totalAmount",
              },
            },
          },
        },
      },
      { $sort: { emp_name: 1 } },
    ];

    const employeesRaw = await db.collection("employee").aggregate(pipeline).toArray();

    const result = employeesRaw.map((emp) => {
      const monthMap = {};
      // Initialize target months to 0
      targetMonths.forEach((m) => {
        monthMap[formatMonthLabel(m)] = 0;
      });
      // Fill actual capacity values
      emp.capacities.forEach((c) => {
        monthMap[formatMonthLabel(c.date)] = c.amount;
      });

      return {
        emp_name: emp.emp_name,
        months: monthMap,
      };
    });

    res.status(200).json({
      months: targetMonths.map((m) => formatMonthLabel(m)),
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load capacity data" });
  }
};
