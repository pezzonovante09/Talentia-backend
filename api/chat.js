export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, task, correct, history } = req.body;

    const prompt = `
You are Tali the Dino — a friendly tutor for children (5–8 years old).
Rules:
- ALWAYS answer in 1–2 short, simple sentences.
- NEVER give the correct answer.
- ALWAYS give hints.
- When child says "help" or "hint", give a more detailed hint.
- NEVER repeat the same hint as before.
- Be warm and encouraging.

TASK:
"${task}"

Correct answer: "${correct}" (do NOT reveal this)

Conversation history:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child says: "${message}"

Give a new helpful hint based on the task.
`;

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

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Try looking at it a different way! 🦕";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused 🦕." });
  }
}
