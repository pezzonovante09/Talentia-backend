import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // --- CORS FIX ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Block any other methods except POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, task } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "You are Tali the Dino – a friendly tutor for kids age 5–8.\n" +
                "IMPORTANT RULES:\n" +
                "- Never give the solution.\n" +
                "- Never say the correct answer.\n" +
                "- Only give hints or encouragement.\n" +
                "- Speak in short, simple sentences.\n" +
                "- Help the child think, not solve.\n\n" +
                "Current task (DO NOT SOLVE IT): " +
                task +
                "\n\nUser message: " +
                message,
            },
          ],
        },
      ],
    });

    const reply = result?.response?.text() || "I'm here to help!";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini error:", error);
    return res.status(500).json({ error: "AI server error" });
  }
}
