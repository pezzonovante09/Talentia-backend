// Talentia-backend/api/chat.js  (Vercel Edge function / Node fetch compatible)
export const config = { runtime: "edge" };

// Preflight handler
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default async function handler(req) {
  try {
    // Read JSON body (works with Edge request)
    const body = await req.json().catch(() => ({}));
    const { message = "", task = "", correct = "", history = [] } = body;

    // Build prompt (short, safe)
    const prompt = `
You are Tali the Dino — a friendly, warm tutor for children 5–8.
Rules:
- Reply in 1–2 short sentences.
- Never give the correct answer.
- If child asks "help" or "hint" give a short actionable hint related to the task.
- If child gives the correct answer, praise warmly.
Task: "${task}"
Correct answer (do not reveal): "${correct}"
History:
${Array.isArray(history) ? history.map(m => `${m.role}: ${m.content}`).join("\n") : ""}
Child: "${message}"
Respond as Tali with a short friendly hint or praise.
`.trim();

    // Call Gemini
    const modelUrl =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const modelRes = await fetch(modelUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 64, temperature: 0.9 },
      }),
    });

    const modelData = await modelRes.json().catch(() => ({}));
    const reply =
      modelData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Let's try a different way — count slowly on your fingers.";

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // <- CRITICAL
    };

    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (err) {
    console.error("Chat handler error:", err);
    return new Response(JSON.stringify({ reply: "Tali is confused 🦕💫" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
