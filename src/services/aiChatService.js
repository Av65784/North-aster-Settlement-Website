import { forgeAssistantChat as forgeAssistantChatFn } from "./aiFunctionsService.js";
import { getForgeContext } from "./forgeService.js";

function summarizeForgeStructure(subjects) {
  if (!subjects?.length) return "No Forge subjects have been generated yet.";

  return subjects
    .map((subject) => {
      const units = (subject.units || [])
        .map((unit) => {
          const subUnits = (unit.subUnits || [])
            .map((subUnit) => {
              const lessons = (subUnit.lessons || []).map((lesson) => `- ${lesson.title}: ${lesson.summary || ""}`).join("\n");
              return `  Sub Unit: ${subUnit.title}\n${lessons}`;
            })
            .join("\n");
          return `Unit: ${unit.title}\n${subUnits}`;
        })
        .join("\n");
      return `Subject: ${subject.title}\n${units}`;
    })
    .join("\n\n");
}

export async function askForgeAssistant(uid, messages) {
  const { subjects, sourceText } = await getForgeContext(uid);
  const structureSummary = summarizeForgeStructure(subjects);

  const fallback = {
    reply: subjects.length
      ? "I can help you revise your Forge subjects. Ask about a specific unit, sub-unit, or lesson."
      : "Upload notes in Forge first so I can answer with your study material context.",
  };

  try {
    return await forgeAssistantChatFn(messages, structureSummary, sourceText);
  } catch (error) {
    console.warn("Cloud Function failed, using fallback:", error);
    return fallback;
  }
}
