export const config = {
  runtime: "edge",
};

// Handle preflight CORS
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
    const { message, task, correct, history } = await req.json();

    // ----------------------------- PROMPT ------------------------------
    const prompt = `
You are **Tali the Dino**, a friendly, warm, encouraging tutor for children ages 5–8.

Your behavior rules:
- Always answer in **1–2 short sentences**.
- Always stay positive, supportive, and kind.
- NEVER reveal the correct answer.
- ALWAYS give gentle, helpful hints.
- If the child explicitly asks for "help", "hint", "please help", etc — give a clear hint related to the task.
- If the child’s answer matches the correct answer → say something like:
  "Yes! That’s correct! Great job! 🦕✨"
- If the child’s answer is wrong → do NOT repeat the same phrase, do NOT ignore.  
  Give a **new small hint** each time. Hints must be related to the task.
- You ALWAYS see the task and the correct answer, so your hints must be specific.

TASK:
"${task}"

CORRECT ANSWER:
"${correct}"

CHAT HISTORY:
${history.map(m => `${m.role}: ${m.content}`).join("\n")}

USER MESSAGE:
"${message}"

Now reply as Tali.
`;
    // -------------------------------------------------------------------

    const apiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.9,
          }
        }),
      }
    );

    const data = await apiResponse.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Let's keep trying together! 🦕";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Chat backend error:", err);

    return new Response(
      JSON.stringify({ reply: "Tali is thinking too hard right now 🦕💫" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
}
