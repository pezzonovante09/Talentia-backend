export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, task, correctAnswer, history = [] } = req.body;

    const prompt = `
You are Tali, a friendly dinosaur who tutors children aged 5–9.

Your personality:
- Warm, upbeat, supportive
- Speak very simply
- Never more than 1–2 short sentences
- Never reveal the answer directly
- Use child-friendly reasoning: counting on fingers, grouping, comparing sizes, noticing details, etc.
- If the child is just chatting, respond like a friendly dino friend.
- If the message is unclear, ask a gentle clarifying question.

TASK TO HELP WITH:
"${task}"

CORRECT ANSWER (DO NOT SAY OUT LOUD):
"${correctAnswer}"

CONVERSATION HISTORY:
${history.map(m => `${m.role}: ${m.content}`).join("\n")}

USER SAID:
"${message}"

Now respond as Tali:
- Give a simple helpful hint if they need help.
- If they are chatting, answer playfully.
- If they are close, encourage gently.
- DO NOT repeat previous hints word-for-word.
- DO NOT say generic things like "try again" or "good job".
- Think fresh each time.
`;

    const rr = await fetch(
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

    const data = await rr.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Let's think together! 🦕";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
