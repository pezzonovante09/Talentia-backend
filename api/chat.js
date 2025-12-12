export default async function handler(req, res) {
  // --- CORS HEADERS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // -- End CORS --

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message, task, correctAnswer, history } = req.body;

    const userText = message.trim().toLowerCase();
    const correctText = String(correctAnswer).trim();

    const isCorrect = userText === correctText.toLowerCase();
    const isHelpRequest = /help|hint|подскажи|не понимаю|explain/i.test(userText);

    // If the answer is correct → praise only
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! You're doing awesome! 🦕💚"
      });
    }

    // Build prompt for hint/help
    const basePrompt = `
You are Tali, a friendly tutor for children (age 5–8).
Answer in 1–2 short, simple sentences.

Task: "${task}"
Correct answer: "${correctAnswer}" (never tell the answer)

User message: "${message}"

Conversation:
${history.map(m => m.role + ": " + m.content).join("\n")}

Respond with a helpful hint and encouragement.
`;

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: basePrompt }] }],
        }),
      }
    );

    const data = await apiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Try thinking in a new way — you can do it!";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({
      reply: "Tali is confused right now 🦕💫"
    });
  }
}
