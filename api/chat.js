export default async function handler(req, res) {
  try {
    const { message, task, correctAnswer, attempts, mistakes, history } = req.body;

    const prompt = `
    You are Tali, a kids tutor (age 5–8). Always answer briefly.

    Task: "${task}"
    Correct answer: "${correctAnswer}"

    Rules:
    - If the child's message MATCHES the correct answer (string compare):
         Respond: "Yes! That's correct! Great job!"
    - If it's wrong:
         Give 1 very small hint.
    - Do NOT reveal the answer.
    - Answer in 1–2 short sentences.

    Conversation:
    ${history.map(m => m.role + ": " + m.content).join("\n")}

    USER: ${message}
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
      "Let's keep going!";

    res.status(200).json({ reply });
  } catch (e) {
    console.error("Backend error:", e);
    res.status(500).json({ reply: "Tali is confused." });
  }
}
