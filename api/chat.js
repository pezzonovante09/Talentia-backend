export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message = "", task = "", correct = "", history = [] } = req.body;

    const prompt = `
You are Tali the Dino — a friendly helper for kids (ages 5–8).
Rules:
- Answer in 1–2 very simple sentences.
- Never reveal the correct answer.
- Always give warm hints if the child asks for help.
- If the child gives the correct answer, praise them.
Task: "${task}"
Correct answer (never say it): "${correct}"

Conversation:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child: "${message}"
    `.trim();

    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const aiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 50 }
      }),
    });

    const data = await aiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Try counting carefully, one step at a time! 🦕";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Backend error:", err);
    return res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
