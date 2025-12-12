// Talentia-backend/api/chat.js  
export default async function handler(req, res) {
  // -------- CORS --------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message = "", task = "", correct = "", history = [] } = req.body;

    const prompt = `
You are Tali the Dino — a kind friendly tutor for kids (age 5–8).
Your rules:
- Always answer in 1–2 short sentences.
- Never say the correct answer.
- If the child says "help" or "hint", give a simple helpful hint.
- If the child says the correct answer, praise warmly.
- Create new natural hints every time (do NOT repeat sentences).
Task: "${task}"
Correct answer (never reveal): "${correct}"

Conversation:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child: "${message}"
Respond as Tali.
    `.trim();

    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const aiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 50, temperature: 0.7 }
      }),
    });

    const data = await aiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Try looking at the numbers step by step! 🦕";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
