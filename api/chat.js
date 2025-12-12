export default async function handler(req, res) {
  // --- FIX CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ----------------

  try {
    const { message, task, correctAnswer, attempts, mistakes, history } = req.body;

    const isCorrect = message.trim() === String(correctAnswer).trim();
    const userAskedHelp = /help|подскажи|не понимаю|hint/i.test(message);

    let basePrompt = `
You are Tali — a friendly tutor for kids (5–8 years old).
Answer VERY SHORT: max 1–2 sentences. Simple words only.
Never reveal the correct answer.
Never continue giving hints after the kid answered correctly.

Task: "${task}"
Correct answer: "${correctAnswer}"
Mistakes: ${mistakes}

Conversation:
${history.map(m => m.role + ": " + m.content).join("\n")}

User: ${message}
`;

    // ---------- CORRECT ANSWER ----------
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! Great job! 🦕💚"
      });
    }

    // ---------- HELP REQUEST ----------
    if (userAskedHelp) {
      const helpPrompt = basePrompt + `
The child asked for help.
Give ONE very small hint.
Do NOT give the correct answer.`;

      const apiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
          process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: helpPrompt }] }]
          })
        }
      );

      const data = await apiRes.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Maybe try counting again?";

      return res.status(200).json({ reply });
    }

    // ---------- WRONG ANSWER ----------
    const wrongPrompt = basePrompt + `
The child gave a wrong answer.
Give ONE short encouraging hint.
Do NOT give the correct answer.`;

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: wrongPrompt }] }]
        })
      }
    );

    const data = await apiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Try again! You can do it!";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
