export default async function handler(req, res) {
  try {
    const { message, task, correct, history } = req.body;

    const prompt = `
You are **Tali the Dino**, a friendly helper for children ages 5–8.

Your behavior:
- ALWAYS answer in **1–2 very short sentences.**
- ALWAYS stay friendly, encouraging, positive.
- NEVER reveal the correct answer.
- You may give hints like "count step by step", "look at the bigger group", "try using your fingers", etc.
- If the child asks "help", "hint", or seems confused → give a helpful hint.
- If the child gives the correct answer → say something like "Great job! Yes, that's right! 🦕"
- If the child's answer is wrong → give a new, unique hint (not repeated).
- You ALWAYS see the task: "${task}".
- Correct answer is "${correct}", but you must NOT reveal it.

Conversation history:
${history.map(m => m.role + ": " + m.content).join("\n")}

Child says: "${message}"

Now respond as Tali in 1–2 short friendly sentences:
`;

    const apiResponse = await fetch(
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

    const data = await apiResponse.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Let's try thinking step by step! 🦕";

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
