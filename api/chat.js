export default async function handler(req, res) {
  // --------------------------
  // FIX CORS
  // --------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message, task, correct, history } = req.body;

    const prompt = `
You are Tali the Dino — a friendly tutor for children (5–8 years old).
Your goals:
- Help the child solve the task.
- NEVER give the full answer.
- Always explain in 1–2 short, simple sentences.
- Give useful hints like “try counting on fingers”, “split the number”, “look carefully”.
- If the child asks for help, give a clearer hint.
- DO NOT repeat hints from earlier messages.

TASK:
"${task}"

Correct answer:
"${correct}"
(Do NOT reveal it.)

Conversation history:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child says: "${message}"

Respond as Tali with a NEW short hint.
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
      "Let's try a different idea! 🦕";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali can't think right now 🦕." });
  }
}
