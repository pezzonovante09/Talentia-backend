import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // For preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, task } = req.body;

    // CHECK ENV KEY EXISTS
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY");
      return res.status(500).json({ error: "API key missing" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt =
      "You are Tali the Dino – a friendly helper for kids aged 5–8.\n" +
      "RULES:\n" +
      "- NEVER give the correct answer.\n" +
      "- NEVER solve the task for the child.\n" +
      "- ALWAYS give hints only.\n" +
      "- Speak very simply (1–2 short sentences).\n" +
      "- Encourage the child.\n\n" +
      "Child task (DO NOT SOLVE): " +
      task +
      "\n\nChild says: " +
      message;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const reply = result?.response?.text?.() || "I'm here! Let's think together.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini backend error:", error);
    res.status(500).json({ error: "AI server error" });
  }
}
