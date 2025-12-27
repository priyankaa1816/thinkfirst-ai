import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your actual API key
const API_KEY = "AIzaSyAOsQ507pjvDVH0yr8lY20I9SqO84Ak3PM"; 

async function listModels() {
  try {
    // In Node 22, fetch is built-in, so we can use it directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    console.log("--- Available Models ---");
    
    if (data.models) {
      data.models.forEach(m => {
        console.log(`Name: ${m.name} | Methods: ${m.supportedGenerationMethods}`);
      });
    } else {
      console.log("No models found. Check your API key.");
      console.log(data); // Prints error if key is wrong
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();