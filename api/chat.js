export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, task, correctAnswer, history = [] } = req.body;

    const user = String(message).trim();
    const correct = String(correctAnswer).trim();
    const isCorrect = user === correct;

    const lastAssistant = history
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    const lastText = lastAssistant?.content?.trim() || "";

    const userWantsHint = /help|hint|подскажи|не понимаю|explain/i.test(
      user.toLowerCase()
    );

    //----------------------------------------------
    // CASE 1 — User answered CORRECTLY
    //----------------------------------------------
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! You're amazing! 🦕💚",
      });
    }

    //----------------------------------------------
    // CASE 2 — User wants a hint → generate hint
    //----------------------------------------------
    if (userWantsHint) {
      const prompt = `
You are Tali — a friendly dinosaur tutor for kids aged 5–8.
Give ONE short hint that helps with this task.
Never reveal the answer.
Always be friendly, simple and encouraging.
Do not repeat your previous hint.

Task: "${task}"
Correct answer (DO NOT TELL): "${correct}"

Previous assistant message: "${lastText}"
User message: "${user}"

Now give ONE helpful hint for a child.
`;

      const hint = await askGemini(prompt);

      return res.status(200).json({
        reply: hint || "Try looking carefully again — you can do it!",
      });
    }

    //----------------------------------------------
    // CASE 3 — Wrong answer, but no hint asked
    //----------------------------------------------
    const encouragements = [
      "Good try! Want a hint? 🦕💚",
      "Almost! You can ask me for help anytime 🦕✨",
      "Nice effort! If you need help, just say 'help'!",
      "You're doing great! Say 'hint' if you want help!",
      "Keep going! I can help if you ask! 🌟",
    ];

    const filtered = encouragements.filter((e) => e !== lastText);
    const reply = filtered[Math.floor(Math.random() * filtered.length)];

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused right now 🦕💫" });
  }
}

// ---------------------------------------------------------
// Gemini helper function
// ---------------------------------------------------------
async function askGemini(prompt) {
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
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("Gemini error:", err);
    return null;
  }
}
