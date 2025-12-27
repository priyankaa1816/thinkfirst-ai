import * as functions from "firebase-functions";
import {createGeminiService} from "./gemini/geminiService";

export const chat = functions
  .region("us-central1")
  .https.onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Get API key from environment variable (NEW WAY)
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
      }

      const {message, conversationHistory, attemptNumber} = req.body;

      if (!message || !conversationHistory || attemptNumber === undefined) {
        res.status(400).json({error: "Missing required fields"});
        return;
      }

      const geminiService = createGeminiService(apiKey);
      const response = await geminiService.processChat({
        message,
        conversationHistory,
        attemptNumber,
      });

      res.json(response);
    } catch (error: unknown) {
      console.error("Error processing chat:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({error: errorMessage});
    }
  });
