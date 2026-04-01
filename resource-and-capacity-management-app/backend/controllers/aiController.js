/* =============================================================================
   aiController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles the AI chat proxy endpoint (POST /api/ai/chat). Before forwarding
     the conversation to Hugging Face, it fetches a live snapshot of the
     MongoDB database and injects it into the system prompt — allowing the AI
     to answer questions about real app data (employee counts, initiative
     statuses, current allocations, etc.).

   HOW IT WORKS:
     1. Validates the incoming messages array from the frontend
     2. Fetches a live DB snapshot via fetchDBSnapshot()
     3. Appends the snapshot to the base system prompt
     4. Forwards the full conversation to Hugging Face (Llama 3.1 via Cerebras)
     5. Returns the AI's reply to the frontend

   SECURITY MODEL:
     • HF_API_KEY is read from process.env — never hardcoded or sent to client.
     • The AI endpoint is protected by JWT auth middleware in aiRoutes.js —
       unauthenticated users cannot call this endpoint.
     • The DB snapshot is read-only — the AI has no ability to write to the DB.
     • If the DB snapshot fails, the AI still responds using the base prompt
       rather than returning an error — graceful degradation.
     • Message validation rejects any payload that doesn't conform to the
       expected { role, content } shape before any external call is made.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton (connectDB)
     • Node 18+ native fetch — no extra packages needed for the HF API call
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   BASE SYSTEM PROMPT
   -----------------------------------------------------------------------------
   Defines the AI's identity, knowledge of the app, and instructions for how
   to behave. The live DB snapshot is appended to this at runtime so the AI
   always has up-to-date context about the current state of the database.

   Keep this prompt concise — every token here counts against the context
   window and increases response latency.
   ============================================================================= */
const BASE_SYSTEM_PROMPT = `You are a helpful assistant embedded in the Resource & Capacity Management Planner, a web application built for Capstone Dynamics. Your job is to help users understand and use the app, and to answer questions about live data from the database.

The app has four account types:
1 = Resource Manager — manages resources, allocations, initiatives, and views reports
2 = Stakeholder — can view and submit initiatives/requests
3 = Team Member — an employee whose allocations are tracked
4 = Admin — manages all user accounts via the Admin Dashboard

Key features of the app:
- Resources Page: view, create, and edit employee records including name, title, department, manager hierarchy, and capacity
- Assignments & Allocations Page: view all employee-project assignments with monthly FTE allocations; edit inline; filter by resource, project, category, leader, requestor, and more
- Initiatives Page: create and manage strategic initiatives/projects with category, leader, requestor, status, and description
- Capacity Report: view allocation data in three modes — Allocation per Category, Allocation per Person (red = over capacity), and Allocation per Activity; export as CSV
- Admin Dashboard: create and edit accounts for all four account types; search accounts; manage passwords
- Profile Page: view and update your own profile details

Navigation: each page has a Back to Dashboard button. The header shows your username and a profile bubble next to an AI chat button.

Security: all passwords are bcrypt-hashed; JWT tokens are used for auth; sessions expire after 30 minutes of inactivity.

You have access to a live snapshot of the database below. Use it to answer any questions about current data — counts, names, statuses, assignments, etc. Be specific and use the actual numbers and names from the snapshot. If the user asks something unrelated to this app, politely redirect them. Keep answers short and practical.`;

/* =============================================================================
   FUNCTION: fetchDBSnapshot
   -----------------------------------------------------------------------------
   Queries MongoDB in parallel across five collections and builds a formatted
   plain-text snapshot of the current app state. This snapshot is injected
   into the AI system prompt so it can answer data questions accurately.

   All five queries run concurrently via Promise.all for minimal latency.
   Fields are projected to only fetch what the AI actually needs, keeping
   the snapshot compact and within the model's context window.

   RETURNS: {string} — Formatted snapshot string, or "" on any error.

   FAILS GRACEFULLY: Any error returns an empty string so the AI handler
     can still respond using the base prompt rather than crashing entirely.
   ============================================================================= */
async function fetchDBSnapshot() {
  try {
    const db = await connectDB();

    // Run all collection queries in parallel — much faster than sequential awaits
    const [employees, assignments, allocations, accounts, departments] = await Promise.all([
      // Only fetch fields the AI needs — _id excluded from all projections
      db.collection("employee").find({}, {
        projection: { _id: 0, emp_id: 1, emp_name: 1, emp_title: 1, dept_no: 1, current_status: 1 }
      }).toArray(),

      db.collection("assignment").find({}, {
        projection: { _id: 0, project_name: 1, category: 1, leader: 1, status: 1, requestor: 1, requestor_vp: 1, requesting_dept: 1, target_period: 1 }
      }).toArray(),

      db.collection("allocation").find({}, {
        projection: { _id: 0, emp_id: 1, activity: 1, category: 1, date: 1, amount: 1 }
      }).toArray(),

      db.collection("account").find({}, {
        projection: { _id: 0, emp_id: 1, "account.acc_type_id": 1, "account.username": 1 }
      }).toArray(),

      db.collection("department").find({}, {
        projection: { _id: 0 }
      }).toArray(),
    ]);

    /* -------------------------------------------------------------------------
       BUILD LOOKUP MAP: dept_no → dept_name
       Used to display human-readable department names next to each employee
       instead of raw dept_no numbers which mean nothing to the AI.
    --------------------------------------------------------------------------- */
    const deptMap = {};
    departments.forEach(d => { deptMap[d.dept_no] = d.dept_name; });

    /* -------------------------------------------------------------------------
       EMPLOYEE STATS
       Split employees into active and inactive for the summary counts.
    --------------------------------------------------------------------------- */
    const activeEmployees   = employees.filter(e => e.current_status === "Active");
    const inactiveEmployees = employees.filter(e => e.current_status === "Inactive");

    /* -------------------------------------------------------------------------
       ACCOUNT TYPE COUNTS
       Tally how many accounts exist per role type (1–4).
       Uses optional chaining since account.acc_type_id may be missing on
       malformed records — skips those rather than crashing.
    --------------------------------------------------------------------------- */
    const accTypeCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    accounts.forEach(a => {
      const t = a.account?.acc_type_id;
      if (accTypeCounts[t] !== undefined) accTypeCounts[t]++;
    });

    /* -------------------------------------------------------------------------
       INITIATIVE STATUS COUNTS
       Groups assignments by their status field and counts each group.
       Produces an object like { "In Progress": 3, "Backlog": 5, ... }
    --------------------------------------------------------------------------- */
    const statusCounts = {};
    assignments.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });

    /* -------------------------------------------------------------------------
       CURRENT MONTH ALLOCATIONS
       Allocation dates are stored as YYYYMM integers (e.g. 202503 for March 2025).
       We compute the current month in the same format and filter allocations
       to only those matching the current month.
    --------------------------------------------------------------------------- */
    const now            = new Date();
    const currentYYYYMM  = now.getFullYear() * 100 + (now.getMonth() + 1);
    const currentAllocations = allocations.filter(a => Number(a.date) === currentYYYYMM);

    // Track which employee IDs have at least one allocation this month
    const allocatedEmpIds = new Set(currentAllocations.map(a => a.emp_id));

    /* -------------------------------------------------------------------------
       PER-EMPLOYEE ALLOCATION SUMMARY
       Groups current month allocations by employee name.
       Falls back to "ID:xxx" if the employee record isn't found —
       handles edge cases where an allocation references a deleted employee.
    --------------------------------------------------------------------------- */
    const empAllocMap = {};
    currentAllocations.forEach(a => {
      const emp  = employees.find(e => e.emp_id === a.emp_id);
      const name = emp?.emp_name || `ID:${a.emp_id}`;
      if (!empAllocMap[name]) empAllocMap[name] = [];
      empAllocMap[name].push(`${a.activity} (${a.amount})`);
    });

    /* -------------------------------------------------------------------------
       ASSEMBLE AND RETURN THE SNAPSHOT STRING
       Plain text format works best for LLM context injection — no markdown
       tables or JSON which can confuse the model's response formatting.
    --------------------------------------------------------------------------- */
    return `
=== LIVE DATABASE SNAPSHOT (${now.toUTCString()}) ===

EMPLOYEES (${employees.length} total):
  Active: ${activeEmployees.length}
  Inactive: ${inactiveEmployees.length}
${employees.map(e => `  - ${e.emp_name} | ${e.emp_title || "N/A"} | ${deptMap[e.dept_no] || e.dept_no || "N/A"} | ${e.current_status || "Active"}`).join("\n")}

ACCOUNTS BY ROLE:
  Resource Managers (type 1): ${accTypeCounts[1]}
  Stakeholders (type 2): ${accTypeCounts[2]}
  Team Members (type 3): ${accTypeCounts[3]}
  Admins (type 4): ${accTypeCounts[4]}

DEPARTMENTS:
${departments.map(d => `  - ${d.dept_no}: ${d.dept_name}`).join("\n")}

INITIATIVES / PROJECTS (${assignments.length} total):
  By status: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(", ")}
${assignments.map(a => `  - "${a.project_name}" | ${a.category} | ${a.status} | Leader: ${a.leader || "N/A"} | Requestor: ${a.requestor || "N/A"}`).join("\n")}

CURRENT MONTH ALLOCATIONS (${currentYYYYMM}):
  Employees allocated this month: ${allocatedEmpIds.size} of ${activeEmployees.length} active
${Object.entries(empAllocMap).map(([name, projects]) => `  - ${name}: ${projects.join(", ")}`).join("\n") || "  None this month"}

=== END SNAPSHOT ===`;

  } catch (err) {
    // Log the error but return empty string — the AI handler will use the base
    // prompt alone rather than returning a 500 error to the user
    console.error("DB snapshot error:", err);
    return "";
  }
}

/* =============================================================================
   HANDLER: chat
   -----------------------------------------------------------------------------
   POST /api/ai/chat
   Protected by JWT middleware in aiRoutes.js.

   Validates the incoming messages array, fetches a live DB snapshot, builds
   the full system prompt, and forwards the conversation to the Hugging Face
   Inference API using the OpenAI-compatible chat completions format.

   REQUEST BODY:
     { messages: [{ role: "user" | "assistant", content: string }, ...] }

   RESPONSE:
     { reply: string } — The AI's response text

   ERROR RESPONSES:
     400 — Invalid or missing messages array
     500 — HF_API_KEY missing from environment
     502 — Hugging Face returned a non-OK response
     503 — Model is still warming up (cold start) — ask user to retry
   ============================================================================= */
export const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    /* -------------------------------------------------------------------------
       VALIDATE: messages must be a non-empty array
       Rejects malformed payloads before any external call is made.
    --------------------------------------------------------------------------- */
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required." });
    }

    /* -------------------------------------------------------------------------
       VALIDATE: every message must have a valid role and string content
       Guards against injection attempts or accidentally malformed frontend payloads.
    --------------------------------------------------------------------------- */
    const valid = messages.every(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    );
    if (!valid) {
      return res.status(400).json({
        error: "Each message must have role (user|assistant) and content (string)."
      });
    }

    /* -------------------------------------------------------------------------
       API KEY CHECK
       Fail fast with a clear message if the key is missing — avoids a
       confusing 401 error from Hugging Face reaching the user.
    --------------------------------------------------------------------------- */
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "HF_API_KEY is missing from your backend .env file."
      });
    }

    /* -------------------------------------------------------------------------
       DB SNAPSHOT + SYSTEM PROMPT ASSEMBLY
       Fetches a fresh snapshot on every request so the AI always has current
       data. If the snapshot fails, falls back to the base prompt gracefully.
    --------------------------------------------------------------------------- */
    console.log("🗄️  Fetching DB snapshot...");
    const dbSnapshot   = await fetchDBSnapshot();
    const systemPrompt = dbSnapshot
      ? `${BASE_SYSTEM_PROMPT}\n\n${dbSnapshot}` // Append snapshot when available
      : BASE_SYSTEM_PROMPT;                        // Fall back to base if snapshot failed

    console.log("📤 Sending request to Hugging Face...");

    /* -------------------------------------------------------------------------
       HUGGING FACE API CALL
       Uses the OpenAI-compatible endpoint on the HF Inference Router.
       The system prompt is always the first message — followed by the full
       conversation history from the frontend.

       model:       Llama 3.1 8B Instruct served via Cerebras for fast inference
       max_tokens:  600 — sufficient for detailed answers without excessive cost
       temperature: 0.7 — balanced between creativity and accuracy
       top_p:       0.9 — nucleus sampling, keeps responses focused
       stream:      false — we wait for the full response before returning
    --------------------------------------------------------------------------- */
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`, // HF API key — server-side only, never sent to browser
        },
        body: JSON.stringify({
          model:       "meta-llama/Llama-3.1-8B-Instruct:cerebras",
          messages:    [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content }))
          ],
          max_tokens:  600,
          temperature: 0.7,
          top_p:       0.9,
          stream:      false,
        }),
      }
    );

    console.log("📥 HF response status:", response.status);

    /* -------------------------------------------------------------------------
       HANDLE NON-OK RESPONSES FROM HUGGING FACE
       503 specifically means the model is cold-starting — a retry message
       is more helpful than a generic error in that case.
    --------------------------------------------------------------------------- */
    if (!response.ok) {
      const errText = await response.text();
      console.error("HF API error:", errText);

      if (response.status === 503) {
        return res.status(503).json({
          error: "The AI model is loading — please wait 20 seconds and try again."
        });
      }

      return res.status(502).json({
        error: `Hugging Face error ${response.status}: ${errText}`
      });
    }

    /* -------------------------------------------------------------------------
       EXTRACT AND RETURN THE REPLY
       The HF response follows the OpenAI chat completions format.
       Optional chaining handles any unexpected response shape gracefully.
    --------------------------------------------------------------------------- */
    const data  = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim()
      || "Sorry, I couldn't get a response. Please try again.";

    return res.json({ reply });

  } catch (err) {
    // Catch-all for unexpected errors (network failures, JSON parse errors, etc.)
    console.error("AI chat proxy error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
};
