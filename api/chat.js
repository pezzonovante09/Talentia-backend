export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message, task, correctAnswer, history = [] } = req.body;

    const prompt = `
You are Tali — a friendly, warm, gentle AI helper for children (ages 5–9).
Your job: explain things simply, kindly, and briefly.

RULES:
- Always answer in 1–2 short sentences.
- Never reveal the correct answer.
- Always give a small, helpful hint.
- If the child chats casually, respond like a friendly dinosaur.
- Avoid repeating phrases used earlier in the conversation.
- Use simple logic: counting, grouping, comparing, noticing patterns, using fingers, etc.

TASK THE CHILD IS WORKING ON:
"${task}"

CORRECT ANSWER (YOU MUST NOT SAY THIS OUT LOUD):
"${correctAnswer}"

CONVERSATION HISTORY:
${history.map(m => `${m.role}: ${m.content}`).join("\n")}

CHILD SAYS: "${message}"

Now respond as Tali:
`;

    const modelRes = await fetch(
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

    const data = await modelRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Try looking at it in a simple way! 🦕";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ reply: "Tali is confused 🌫️" });
  }
}
