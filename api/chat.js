import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
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
                "You are Tali the Dino — a friendly tutor for young kids (5–8 y.o).\n" +
                "Always reply in 1–2 short sentences.\n" +
                "Never make explanations long.\n" +
                "Child’s current task: " + task + "\n\n" +
                "Message: " + message
            }
          ]
        }
      ]
    });

    const reply = result?.response?.text() || "I'm here to help!";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: "AI server error" });
  }
}
