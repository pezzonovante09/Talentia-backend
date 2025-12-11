\export const config = {
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
    const { message, task, correctAnswer, history } = body;

    // Compare with trimming punctuation
    const cleanedUserAnswer = message.trim().replace("?", "");
    const cleanedCorrect = String(correctAnswer).trim();

    const isCorrect = cleanedUserAnswer === cleanedCorrect;

    // ---------- PROMPTS ----------
    let prompt;

    if (isCorrect) {
      prompt = `
You are Tali the Dino — a friendly learning companion for children aged 5–8.

The child answered correctly.

Respond with ONE short, simple encouraging sentence.
Do NOT add explanations.
Examples:
- "Yes! That's correct! Great job!"
- "You got it! I'm proud of you!"
- "Awesome! You did it!"
      `;
    } else {
      prompt = `
You are Tali the Dino — a friendly tutor for children aged 5–8.

Task: "${task}"
Correct answer (DO NOT reveal this): "${correctAnswer}"

The child answered incorrectly.

Give ONE very small hint.
Use ONE short sentence only.
Never reveal the answer.
Never give long explanations.

Examples:
- "Try counting again — you're close!"
- "Look carefully, one group is larger."
- "Think slowly, you can do it!"
- "Maybe try comparing them one more time!"
      `;
    }

    // ---------- SEND TO GEMINI ----------
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

    // ---------- SEND RESPONSE ----------
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
