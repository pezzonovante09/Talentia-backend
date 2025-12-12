export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // --------------

  try {
    const { message, task, correctAnswer, history = [] } = req.body;
    const user = String(message).trim();
    const correct = String(correctAnswer).trim().toLowerCase();

    const isCorrect = user.toLowerCase() === correct;
    const lastAssistant = history.slice().reverse().find(m => m.role === "assistant");
    const lastText = lastAssistant?.content?.trim() || "";

    // ---------------------------------------------
    // 1) Если ответ правильный → похвала, НИКАКИХ подсказок
    // ---------------------------------------------
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! Great job! 🦕💚"
      });
    }

    // ---------------------------------------------
    // 2) Генерируем подсказку через модель (всегда)
    // ---------------------------------------------
    const prompt = `
You are Tali, a friendly dinosaur tutor for children aged 5–8.

TASK:
"${task}"

CORRECT ANSWER (DO NOT TELL): "${correctAnswer}"

USER MESSAGE:
"${user}"

Your job:
- ALWAYS respond with ONE short, simple hint that helps solve the task.
- The hint MUST teach how to think (counting, comparing, using fingers, grouping, visualizing, etc.)
- The hint MUST be child-friendly and warm.
- NEVER reveal the answer.
- NEVER say generic phrases like "Try again" or "Good try".
- NEVER offer choices or talk about how to phrase things.
- NEVER repeat the previous hint.
- ALWAYS give a real strategy a child can use.

Previous hint from you:
"${lastText}"

Now produce ONE new helpful hint for the child. No explanations. No meta comments.
`;

    let hint = await askGemini(prompt);

    // если ответ совпал с предыдущим → регенерация
    if (
      hint &&
      lastText &&
      hint.trim().toLowerCase() === lastText.trim().toLowerCase()
    ) {
      hint = await askGemini(prompt + "\nIMPORTANT: Hint must be DIFFERENT.");
    }

    // если модель дала пустую фигню → fallback переформулировка
    if (!hint || hint.length < 2) {
      hint = await askGemini(
        `Rephrase this child hint in a simpler way: "${lastText}"`
      );
    }

    return res.status(200).json({
      reply: hint || "Try counting slowly, you can do it! 🦕✨"
    });

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({
      reply: "Tali is confused right now 🦕💫"
    });
  }
}

// ----------------------------------------------------
// Gemini caller
// ----------------------------------------------------
async function askGemini(prompt) {
  try {
    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await apiRes.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("Gemini error:", err);
    return null;
  }
}
