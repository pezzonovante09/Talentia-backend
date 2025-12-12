export default async function handler(req, res) {
  try {
    const { message, task, correctAnswer, attempts, mistakes, history } = req.body;

    const isCorrect = message.trim() === String(correctAnswer).trim();
    const userAskedHelp = /help|подскажи|не понимаю|hint/i.test(message);

    let basePrompt = `
You are Tali — a friendly tutor for kids (5–8 years old).
Answer VERY SHORT: max 1–2 sentences. Simple words only.
Never reveal the correct answer.
Never continue giving hints after the kid answered correctly.

Current task: "${task}"
Correct answer: "${correctAnswer}"
User mistakes so far: ${mistakes}

Conversation:
${history.map(m => m.role + ": " + m.content).join("\n")}

User: ${message}
`;

    // --- CASE 1: Correct answer ---
    if (isCorrect) {
      const reply = "Yes! That's correct! Great job! 🦕💚";
      return res.status(200).json({ reply });
    }

    // --- CASE 2: User explicitly asked for help ---
    if (userAskedHelp) {
      const helpPrompt = basePrompt + `
The child is asking for help.
Give ONE tiny hint only. Do NOT give the answer.
Your reply:`;

      const apiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
          process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: helpPrompt }] }]
          }),
        }
      );

      const data = await apiRes.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Try looking at the numbers carefully!";

      return res.status(200).json({ reply });
    }

    // --- CASE 3: Wrong answer (child guessed) ---
    const wrongPrompt = basePrompt + `
The child gave a wrong answer.
Respond with ONE short encouraging hint.
Do NOT give the correct answer.
Your reply:`;

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: wrongPrompt }] }]
        }),
      }
    );

    const data = await apiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Try again! Look closely, you can do it!";

    return res.status(200).json({ reply });

  } catch (e) {
    console.error("Backend error:", e);
    return res.status(500).json({ reply: "Tali is confused 🦕💫" });
  }
}
