import { isFirebaseConfigured } from "../config/firebase.js";

export function hasGeminiKey() {
  // AI is now handled by secure Cloud Functions
  // This function is kept for backward compatibility
  return isFirebaseConfigured;
}

export function getGeminiModel() {
  // Model is now configured in Cloud Functions
  return "gemini-1.5-flash";
}

// These functions are deprecated - use aiFunctionsService instead
// They're kept for backward compatibility but will be removed
export async function callGeminiJson(prompt, fallbackValue = null) {
  console.warn("callGeminiJson is deprecated. Use Cloud Functions via aiFunctionsService instead.");
  if (fallbackValue !== null) return fallbackValue;
  throw new Error("Direct Gemini API calls are no longer supported. Use Cloud Functions.");
}

export async function callGeminiText(prompt, fallbackText = "") {
  console.warn("callGeminiText is deprecated. Use Cloud Functions via aiFunctionsService instead.");
  if (fallbackText) return fallbackText;
  throw new Error("Direct Gemini API calls are no longer supported. Use Cloud Functions.");
}
