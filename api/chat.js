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

    const prompt =
      "You are Tali the Dino – a friendly helper for kids ages 5–8.\n" +
      "RULES:\n" +
      "- NEVER give the correct answer.\n" +
      "- NEVER solve the task.\n" +
      "- Speak in short, simple sentences.\n" +
      "- Encourage the child.\n" +
      "- If mistakes >= 1 → give gentle hint.\n" +
      "- If mistakes >= 2 → give stronger hint.\n" +
      "- If attempts >= 3 → offer clear guidance but NOT the answer.\n\n" +
      "TASK (do NOT solve): " + task + "\n" +
      "Attempts: " + attempts + "\n" +
      "Mistakes: " + mistakes + "\n" +
      "Child said: " + message;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply = result?.response?.text?.() || "Let's keep thinking together!";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: "AI server error" });
  }
}
