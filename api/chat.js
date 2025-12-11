export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    // CORS
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

    if (!task || correctAnswer === undefined) {
      return new Response(
        JSON.stringify({ reply: "Missing fields." }),
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const cleanedUser = message.trim().replace("?", "").toLowerCase();
    const cleanedCorrect = String(correctAnswer).trim();

    const helpKeywords = ["help", "please", "подскажи", "i don't know", "не знаю", "help me"];

    const isHelp = helpKeywords.some((k) => cleanedUser.includes(k));
    const isCorrect = cleanedUser === cleanedCorrect.toLowerCase();

    let prompt;

    if (isHelp) {
      // CHILD REQUESTED HELP
      prompt = `
You are Tali the Dino — a friendly tutor for kids (5–8 years old).

The child is asking for help:
"${message}"

Task: "${task}"

Give ONE small, simple hint.
Do NOT tell the answer.
Use one short sentence only.

Examples:
- "Try counting them slowly one more time!"
- "Look again — one group is a little bigger."
- "Start by checking the first number."
`;
    } else if (isCorrect) {
      // CORRECT ANSWER
      prompt = `
You are Tali the Dino, a friendly kids tutor.

The child answered correctly.

Respond with ONE short praise sentence, like:
- "Yes! That's correct! Great job!"
- "You did it! Amazing!"

Do NOT add anything else.
`;
    } else {
      // INCORRECT ANSWER
      prompt = `
You are Tali the Dino — a friendly tutor for kids 5–8.

The child answered incorrectly:
"${message}"

Task: "${task}"
Do NOT reveal the answer.

Give ONE very small hint.
Use ONE short sentence only.
Examples:
- "Try counting again — you're close!"
- "Look carefully, one group is larger."
- "Maybe compare them one more time!"
`;
    }

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

    let reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      (isCorrect
        ? "Yes! That's correct! Great job!"
        : "Try again — you can do it!");

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
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
