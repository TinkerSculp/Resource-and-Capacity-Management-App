import "./loadEnv.js"; // Load .env variables FIRST — must precede all other imports

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";

import securityHeaders from "./middleware/security.js";
import httpsRedirect from "./middleware/httpsRedirect.js";
import corsOptions from "./middleware/corsOptions.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import calendarViewRoutes from "./routes/calendarViewRoutes.js";
import capacitySummaryRoutes from "./routes/capacitySummaryRoutes.js";
import capacityMonthsRoutes from "./routes/capacityMonthsRoutes.js";
import initiativeRoutes from "./routes/initiativeRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";                         

const app = express();
const port = process.env.PORT || 3001;

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(httpsRedirect);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/calendar-view", calendarViewRoutes);
app.use("/api/capacity-summary", capacitySummaryRoutes);
app.use("/api/capacity-summary/months", capacityMonthsRoutes);
app.use("/api/initiatives", initiativeRoutes);
app.use("/api/assignments-allocations", assignmentRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);                                        

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Backend running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });