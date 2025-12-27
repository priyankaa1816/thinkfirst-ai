
# ThinkFirst AI

ThinkFirst AI is a specialized learning chatbot. It detects when you're asking technical or educational questions and guides you through a multi-step hint process before revealing the full solution.

## Features
- **Dual Mode AI:** Switches between "General Chat" and "Learning Mode" automatically.
- **Hint Progression:** Get small hints, then stronger ones, before the full answer.
- **Session Tracking:** Persist your conversations and track your learning progress.
- **Clean UI:** Responsive design using Tailwind CSS.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)
- Gemini API Key

### Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. **Configure Environment:**
   - Create a `.env.local` file in the root:
     ```
     VITE_BACKEND_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1/chat
     ```
   - For this demo/sandbox, the frontend uses a direct (mocked) call to Gemini for immediate interactivity. If deploying for real, use the Cloud Function.

3. **Set API Key:**
   The application requires `process.env.API_KEY` for Gemini. In this sandbox environment, it's pre-configured.

4. **Run Frontend:**
   ```bash
   npm run dev
   ```

5. **Run Backend (Optional):**
   ```bash
   firebase emulators:start --only functions
   ```

### Deployment

1. **Firebase Init:**
   ```bash
   firebase init
   ```
2. **Deploy Functions:**
   ```bash
   firebase deploy --only functions
   ```
3. **Set Secret:**
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Firebase Cloud Functions (TypeScript)
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth
- **AI:** Google Gemini API (`gemini-2.5-flash-lite`)
