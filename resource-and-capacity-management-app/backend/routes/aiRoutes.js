/* =============================================================================
   aiRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the AI chat proxy route. Mounted in server.js under /api/ai.

     Full route map:
       POST /api/ai/chat — Proxy chat messages to Hugging Face Llama-3.1-8B

   SECURITY MODEL:
     • protect middleware is applied to all routes — unauthenticated users
       cannot call the AI endpoint.
     • All request validation and API key handling is in aiController.js.

   DEPENDENCIES:
     • express        — Router instance
     • aiController   — chat handler
     • auth           — protect JWT middleware
   ============================================================================= */

import express from "express";
import { protect } from "../middleware/auth.js";
import { chat } from "../controllers/aicontroller.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   POST /api/ai/chat
   -----------------------------------------------------------------------------
   Requires JWT authentication. Proxies the conversation to Hugging Face
   and returns the AI reply.
----------------------------------------------------------------------------- */
router.post("/chat", protect, chat);

export default router;

