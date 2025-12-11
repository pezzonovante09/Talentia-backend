import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, task, attempts, mistakes } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are Tali, a friendly kids tutor (age 5-8).
      You must ALWAYS answer in 1–2 VERY short sentences.

      The child is solving a task: "${task}".

      The correct answer is: "${correctAnswer}".

      If the child's message contains the correct answer:
      - DO NOT give hints.
      - DO NOT explain.
      - Just praise: "Yes! That's correct!" / "Great job!" / "Well done!"

      If the answer is wrong:
      - give only a tiny hint (1 sentence).
      - Do NOT reveal the correct answer.
      - Be supportive.

      Conversation history:
      ${history
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n")}

      USER: ${message}
      `;


    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply = result?.response?.text?.() || "Let's think together!";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
}
