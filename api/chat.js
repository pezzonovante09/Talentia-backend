export default async function handler(req, res) {
  try {
    const { message, task, correct, history } = req.body;

    const prompt = `
You are Tali the Dino — a friendly tutor for children (5–8 years old).
You ALWAYS reply in 1–2 very short, friendly sentences.

Your rules:
- Never give the exact answer, even if the child asks directly.
- If the child's message equals the correct answer → praise warmly.
- If the answer is wrong → give a helpful hint, simple, friendly.
- If the child asks for help or says "hint" → give 1 simple hint.
- Use emojis sometimes, but not too many.
- Avoid repeating the same sentence — always vary wording.

Task: "${task}"
Correct answer: "${correct}"

Conversation history:
${history
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join("\n")}

Child says: "${message}"
Respond as Tali:
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
      "I'm still thinking, friend! 🦕";

    res.status(200).json({ reply });
  } catch (e) {
    console.error("Backend error:", e);
    res.status(500).json({ reply: "Tali is confused." });
  }
}
