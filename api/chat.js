// api/chat.js
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  // -------------------

  try {
    const { message, task, correctAnswer, history = [] } = req.body || {};

    const userText = String(message).trim();
    const correctText = String(correctAnswer).trim().toLowerCase();

    const lastAssistant = history
      ?.slice()
      ?.reverse()
      ?.find((m) => m.role === "assistant");
    const lastAssistantText = lastAssistant ? lastAssistant.content.trim() : "";

    const isCorrect =
      userText.toLowerCase() === correctText.toLowerCase();

    // ----------------------
    // If correct → praise
    // ----------------------
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! You're amazing! 🦕💚"
      });
    }

    // ----------------------
    // Build prompt for generating hints
    // ----------------------
    const makePrompt = (forceDifferent = false) => `
You are Tali — a friendly dinosaur tutor for children aged 5–8.

Task: "${task}"

Rules:
- Never reveal the correct answer.
- Respond in ONLY 1–2 very short sentences.
- Keep the tone supportive and friendly.
- Give a helpful hint appropriate for a child.
- If user seems confused, explain even simpler.
- DO NOT repeat yourself.

User message: "${userText}"

${
  forceDifferent
    ? `IMPORTANT: Your previous hint was:\n"${lastAssistantText}"\nYour NEW hint MUST be different from that.`
    : ""
}

Conversation history:
${history.map((m) => m.role + ": " + m.content).join("\n")}

Now give a new hint:
`;

    // ----------------------
    // 1st attempt: generate normal hint
    // ----------------------
    let hint = await callGemini(makePrompt(false));

    // If Gemini returned exactly the same as last time → regenerate
    if (
      hint &&
      lastAssistantText &&
      hint.trim().toLowerCase() === lastAssistantText.trim().toLowerCase()
    ) {
      hint = await callGemini(makePrompt(true));
    }

    // If still empty → fallback to rephrase
    if (!hint || hint.trim().length < 2) {
      hint = await callGemini(
        `Rephrase this hint to make it shorter and friendlier for a child: "${lastAssistantText}"`
      );
    }

    return res.status(200).json({ reply: hint || "Try again!" });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused right now 🦕💫" });
  }
}

// ----------------------
// Gemini request helper
// ----------------------
async function callGemini(prompt) {
  try {
    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await apiRes.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    );
  } catch (err) {
    console.error("Gemini call error:", err);
    return null;
  }
}
