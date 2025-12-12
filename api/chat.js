export default async function handler(req, res) {
  try {
    const { message, task, correctAnswer, history } = req.body;

    const prompt = `
You are Tali — a friendly children's tutor (age 5–8).
You ALWAYS respond in 1–2 short, simple sentences.

Your job:
- Help the child solve the current task.
- NEVER give the direct answer.
- ALWAYS give a small hint.
- If the child asks for help ("help", "hint", "I don't know"), give a clearer hint.
- Do NOT repeat the same hint from previous messages.

Here is the task the child is solving:
"${task}"

Correct answer: "${correctAnswer}"
(Do NOT say it out loud.)

Conversation history:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child says: "${message}"

Give a new unique hint based on the task.
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
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Let's try a different way! 🦕";

    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Backend error:", e);
    return res.status(500).json({ reply: "Tali is confused." });
  }
}
