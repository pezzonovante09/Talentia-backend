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
    const { message, task, correctAnswer, history } = req.body;

    const trimmedUser = message.trim();
    const isCorrect = trimmedUser === String(correctAnswer).trim();

    // -----------------------------
    // 1) CORRECT ANSWER ALWAYS → PRAISE
    // -----------------------------
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! Great job! 🦕💚"
      });
    }

    // If not correct → ALWAYS HELP
    const helpPrompt = `
You are Tali — a friendly learning dinosaur for kids aged 5–8.
Your job is ALWAYS to help the child understand, even after many mistakes.

RULES:
- Always answer in 1–2 short, simple sentences.
- Never reveal the correct answer.
- Always give a small hint + encouragement.
- Keep the language friendly and simple for children.
- The child just gave a wrong answer or asked for help.

Task: "${task}"
Correct answer: "${correctAnswer}" (DO NOT TELL THIS)

Conversation history:
${history.map(m => m.role + ": " + m.content).join("\n")}

User: ${trimmedUser}
Respond with: a tiny hint + encouragement.
`;

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

    const aiReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Try again! You’re doing great!";

    return res.status(200).json({ reply: aiReply });

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
