// functions/src/index.ts
import * as functions from 'firebase-functions';
import { createGeminiService } from './gemini/geminiService';

export const chat = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const apiKey = functions.config().gemini?.key || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const geminiService = createGeminiService(apiKey);
    
    const response = await geminiService.processChat({
      message,
      conversationHistory: conversationHistory || [],
    });

    res.json(response);
  } catch (error: any) {
    console.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    });
  }
});
