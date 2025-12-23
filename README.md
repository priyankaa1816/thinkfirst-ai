
# ThinkFirst AI - Effort-Based Tutor

An MVP AI tutor that forces students to show effort before revealing solutions to DSA and Math problems.

## Setup Instructions

1.  **Firebase Configuration**:
    *   Create a project on the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Authentication** (Google Sign-In).
    *   Enable **Cloud Firestore**.
    *   Create a Web App and copy the configuration to `firebase.ts`.

2.  **API Key**:
    *   Ensure your `process.env.API_KEY` is set to a valid Gemini API key.

3.  **Local Development**:
    *   Install dependencies: `npm install`
    *   Run dev server: `npm run dev`

4.  **Deployment**:
    *   Build the project: `npm run build`
    *   Install Firebase CLI: `npm install -g firebase-tools`
    *   Login: `firebase login`
    *   Initialize: `firebase init hosting` (Select `dist` as the public directory).
    *   Deploy: `firebase deploy`

## Tech Stack
*   **React 18** + **TypeScript** + **Vite**
*   **Tailwind CSS** for UI
*   **Firebase** for Auth & Database
*   **Gemini 3 Pro/Flash** for classification and tutoring logic
