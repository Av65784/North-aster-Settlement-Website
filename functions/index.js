import { getFirestore } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();
const db = getFirestore();
const storage = getStorage();

// Get Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Validate configuration
if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set in environment. AI functions will fail.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: GEMINI_MODEL }) : null;

// Helper: Parse JSON from Gemini response
function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// Helper: Call Gemini with JSON response
async function callGeminiJson(prompt, fallbackValue = null) {
  if (!geminiModel) {
    if (fallbackValue !== null) return fallbackValue;
    throw new HttpsError("failed-precondition", "Gemini API is not configured.");
  }

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    if (!text) {
      if (fallbackValue !== null) return fallbackValue;
      throw new HttpsError("internal", "Gemini returned no text.");
    }

    return parseGeminiJson(text);
  } catch (error) {
    console.error("Gemini API error:", error);
    if (fallbackValue !== null) return fallbackValue;
    throw new HttpsError("internal", `Gemini request failed: ${error.message}`);
  }
}

// Helper: Call Gemini with text response
async function callGeminiText(prompt, fallbackText = "") {
  if (!geminiModel) {
    if (fallbackText) return fallbackText;
    throw new HttpsError("failed-precondition", "Gemini API is not configured.");
  }

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    });

    const text = result.response.text()?.trim();
    if (!text) {
      if (fallbackText) return fallbackText;
      throw new HttpsError("internal", "Gemini returned no text.");
    }

    return text;
  } catch (error) {
    console.error("Gemini API error:", error);
    if (fallbackText) return fallbackText;
    throw new HttpsError("internal", `Gemini request failed: ${error.message}`);
  }
}

// Helper: Validate user is authenticated
function validateAuthenticated(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  return context.auth.uid;
}

// Cloud Function: Generate learning course from notes
export const generateLearningCourse = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { sourceText, sourceFileId } = request.data;

  if (!sourceText || typeof sourceText !== "string") {
    throw new HttpsError("invalid-argument", "sourceText is required and must be a string.");
  }

  const prompt = `Create structured active-recall learning content from these notes.
Return strict JSON only with this exact shape:
{
  "subjects": [
    {
      "title": "string",
      "description": "string",
      "units": [
        {
          "title": "string",
          "summary": "string",
          "lessons": [
            {
              "title": "string",
              "summary": "string",
              "difficulty": "easy|medium|hard",
              "keyPoints": ["string"],
              "questions": [
                {
                  "prompt": "string",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "must exactly match one option",
                  "explanation": "string",
                  "topic": "string",
                  "difficulty": "easy|medium|hard"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Create concise lessons, 3-5 recall questions per lesson, and only use facts grounded in the notes.

NOTES:
${sourceText}`;

  const fallback = {
    subjects: [
      {
        title: "Generated from Notes",
        description: "Generated from your notes.",
        units: [
          {
            title: "Unit 1",
            summary: sourceText.slice(0, 200),
            lessons: [
              {
                title: "Lesson 1",
                summary: sourceText.slice(0, 400),
                difficulty: "medium",
                keyPoints: [sourceText.slice(0, 100)],
                questions: [
                  {
                    prompt: "What is the main topic?",
                    options: [sourceText.slice(0, 50), "Option B", "Option C", "Option D"],
                    correctAnswer: sourceText.slice(0, 50),
                    explanation: "Based on the notes provided.",
                    topic: "Main topic",
                    difficulty: "medium",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const generated = await callGeminiJson(prompt, fallback);
  return generated;
});

// Cloud Function: AI Tutor Chat
export const aiTutorChat = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { messages, context } = request.data;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpsError("invalid-argument", "messages must be a non-empty array.");
  }

  const lastMessage = messages[messages.length - 1]?.content || "";
  const conversation = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `You are LockOn Revision's AI tutor. Be concise, helpful, and active-recall focused.
Return JSON only: {"reply":"string"}

Conversation:
${conversation}`;

  const fallback = {
    reply: lastMessage.length > 0
      ? `Local tutor: ${lastMessage} connects back to your uploaded lessons. Try answering it as a question first, then compare against your lesson summaries.`
      : "Local tutor ready. Ask about a topic from your notes.",
  };

  const result = await callGeminiJson(prompt, fallback);
  return result;
});

// Cloud Function: Generate Question Hint
export const generateQuestionHint = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { questionId } = request.data;

  if (!questionId || typeof questionId !== "string") {
    throw new HttpsError("invalid-argument", "questionId is required and must be a string.");
  }

  // Fetch question from Firestore
  const questionRef = db.collection("users").doc(uid).collection("questions").doc(questionId);
  const questionDoc = await questionRef.get();

  if (!questionDoc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  const question = questionDoc.data();

  const prompt = `Return JSON only: {"hint":"one short hint that helps without revealing the answer"}
Question:
${JSON.stringify(question)}`;

  const fallback = { hint: `Look for the option that directly matches: ${question.topic}.` };
  const result = await callGeminiJson(prompt, fallback);
  return result;
});

// Cloud Function: Explain Wrong Answer
export const explainWrongAnswer = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { questionId, selectedAnswer } = request.data;

  if (!questionId || typeof questionId !== "string") {
    throw new HttpsError("invalid-argument", "questionId is required and must be a string.");
  }
  if (!selectedAnswer || typeof selectedAnswer !== "string") {
    throw new HttpsError("invalid-argument", "selectedAnswer is required and must be a string.");
  }

  // Fetch question from Firestore
  const questionRef = db.collection("users").doc(uid).collection("questions").doc(questionId);
  const questionDoc = await questionRef.get();

  if (!questionDoc.exists) {
    throw new HttpsError("not-found", "Question not found.");
  }

  const question = questionDoc.data();

  const prompt = `Return JSON only: {"explanation":"brief explanation of why the selected answer is wrong and why the correct answer is right"}
Selected answer: ${selectedAnswer}
Question:
${JSON.stringify(question)}`;

  const fallback = {
    explanation: `"${selectedAnswer}" is not the best match. The answer is "${question.correctAnswer}" because it is grounded in the uploaded lesson.`,
  };
  const result = await callGeminiJson(prompt, fallback);
  return result;
});

// Cloud Function: Generate Forge Structure
export const generateForgeStructure = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { sourceText } = request.data;

  if (!sourceText || typeof sourceText !== "string") {
    throw new HttpsError("invalid-argument", "sourceText is required and must be a string.");
  }

  const prompt = `Analyze the study material and create a structured learning path.
Return strict JSON only with this exact shape:
{
  "subject": {
    "title": "string",
    "description": "string",
    "units": [
      {
        "title": "string",
        "summary": "string",
        "subUnits": [
          {
            "title": "string",
            "summary": "string",
            "lessons": [
              {
                "title": "string",
                "summary": "string",
                "keyPoints": ["string"]
              }
            ]
          }
        ]
      }
    ]
  }
}

Requirements:
- Create 2-3 units minimum.
- Each unit must have 2-3 sub-units.
- Each sub-unit must have 2-3 lessons.
- Ground all titles and summaries in the uploaded material.
- Use clear, student-friendly names.

STUDY MATERIAL:
${sourceText}`;

  const fallback = {
    subject: {
      title: "Study Subject",
      description: "Generated learning path from your notes.",
      units: [
        {
          title: "Unit 1",
          summary: sourceText.slice(0, 120),
          subUnits: [
            {
              title: "Sub Unit 1",
              summary: "Core ideas.",
              lessons: [
                { title: "Lesson 1", summary: "Review key concepts.", keyPoints: [sourceText.slice(0, 80)] },
                { title: "Lesson 2", summary: "Apply what you learned.", keyPoints: [] },
              ],
            },
          ],
        },
      ],
    },
  };

  const generated = await callGeminiJson(prompt, fallback);
  return generated;
});

// Cloud Function: Forge Assistant Chat
export const forgeAssistantChat = onCall(async (request) => {
  const uid = validateAuthenticated(request);
  const { messages, structureSummary, sourceText } = request.data;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpsError("invalid-argument", "messages must be a non-empty array.");
  }
  if (!structureSummary || typeof structureSummary !== "string") {
    throw new HttpsError("invalid-argument", "structureSummary is required and must be a string.");
  }

  const conversation = messages
    .map((message) => `${message.role === "user" ? "Student" : "Assistant"}: ${message.content}`)
    .join("\n");

  const prompt = `You are LockOn Revision's AI study assistant.
Answer using the student's uploaded study material and generated Forge learning structure whenever possible.
Be concise, encouraging, and focused on active recall.

Generated learning structure:
${structureSummary}

Uploaded study material (excerpt):
${sourceText?.slice(0, 80000) || "No source text stored yet."}

Conversation:
${conversation}

Return strict JSON only: {"reply":"your response here"}`;

  const fallback = {
    reply: "I can help you revise your Forge subjects. Ask about a specific unit, sub-unit, or lesson.",
  };

  const result = await callGeminiJson(prompt, fallback);
  return result;
});
