export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    // --- CORS preflight ---
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const body = await req.json();
    const { message, task, correctAnswer, attempts, mistakes, history } = body;

    const prompt = `
You are Tali, a friendly tutor for kids aged 5–8.
Always answer in 1–2 short sentences.

Task: "${task}"
Correct answer: "${correctAnswer}"

Rules:
- If the child's message equals the correct answer → praise briefly.
- If wrong → small hint only (never reveal the answer).
- Always upbeat and simple.

Conversation:
${history.map((m) => `${m.role}: ${m.content}`).join("\n")}

Child says: ${message}
    `;

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await apiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Let's keep going!";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    console.error("BACKEND ERROR:", err);

    return new Response(JSON.stringify({ reply: "Tali is confused." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
