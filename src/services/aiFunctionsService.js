import { httpsCallable } from "firebase/functions";
import { functions, isFirebaseConfigured } from "../config/firebase.js";

// Helper: Call Cloud Function with error handling
async function callFunction(functionName, data) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. AI features require Firebase.");
  }

  try {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  } catch (error) {
    console.error(`Cloud Function ${functionName} error:`, error);
    throw new Error(error.message || `Failed to call ${functionName}`);
  }
}

// Generate learning course from notes
export async function generateLearningCourse(sourceText, sourceFileId = null) {
  return callFunction("generateLearningCourse", { sourceText, sourceFileId });
}

// AI Tutor Chat
export async function aiTutorChat(messages, context = {}) {
  return callFunction("aiTutorChat", { messages, context });
}

// Generate Question Hint
export async function generateQuestionHint(questionId) {
  const result = await callFunction("generateQuestionHint", { questionId });
  return result.hint;
}

// Explain Wrong Answer
export async function explainWrongAnswer(questionId, selectedAnswer) {
  const result = await callFunction("explainWrongAnswer", { questionId, selectedAnswer });
  return result.explanation;
}

// Generate Forge Structure
export async function generateForgeStructure(sourceText) {
  return callFunction("generateForgeStructure", { sourceText });
}

// Forge Assistant Chat
export async function forgeAssistantChat(messages, structureSummary, sourceText) {
  const result = await callFunction("forgeAssistantChat", { messages, structureSummary, sourceText });
  return result.reply;
}
