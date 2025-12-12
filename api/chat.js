export default async function handler(req, res) {
  // --- CORS fix ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // -----------------

  try {
    const { message, task, correctAnswer, history } = req.body;

    const user = message.trim().toLowerCase();
    const correct = String(correctAnswer).trim();

    const isCorrect = user === correct;
    const isHelpRequest =
      ["help", "hint", "i need help", "what do i do", "explain"].some((w) =>
        user.includes(w)
      );

    // ✔ If correct → short praise, no hint, no loop
    if (isCorrect) {
      return res.status(200).json({
        reply: "Yes! That's correct! You're amazing! 🦕💚"
      });
    }

    // ✔ If child asks for help → explanation
    if (isHelpRequest) {
      const helpPrompt = `
You are Tali, a friendly dino tutor for kids (5–8 years old).

The child asked for HELP.

Task: "${task}"
Correct answer: "${correctAnswer}" (DO NOT reveal it)

Rules:
- Respond with 1–2 simple child-friendly sentences.
- Give a helpful explanation of how to think about the problem.
- Encourage the child.
- DO NOT say "Try again" in this case.
- Do NOT reveal the answer.
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
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Let's think together!";

      return res.status(200).json({ reply });
    }

    // ❌ Wrong answer → give unique hint (NO LOOPING TEXT)
    const wrongPrompt = `
You are Tali, a sweet dino tutor for kids aged 5–8.

The child gave a WRONG answer.

Task: "${task}"
Correct answer: "${correctAnswer}" (DO NOT tell it)

Rules:
- Give 1 small helpful hint.
- Use a DIFFERENT hint every time, don't repeat the same phrase.
- Use 1–2 short sentences max.
- Encourage the child.
- DO NOT say "Try again!"
- Never reveal the correct answer.

Conversation so far:
${history.map(m => m.role + ": " + m.content).join("\n")}
`;

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: wrongPrompt }] }]
        }
      }
    );

    const data = await apiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Let's think together!";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({
      reply: "Tali can't answer right now 🦕💫"
    });
  }
}
