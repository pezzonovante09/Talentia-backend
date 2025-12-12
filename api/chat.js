// api/chat.js
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message = "", task = "", correctAnswer = "", history = [] } = req.body || {};
    const user = String(message).trim();
    const correct = String(correctAnswer).trim();

    // last assistant content (if any)
    const lastAssistant = history && Array.isArray(history)
      ? [...history].reverse().find(m => m.role === "assistant")
      : null;
    const lastAssistantText = lastAssistant ? String(lastAssistant.content).trim() : "";

    // helper to normalize text for comparison
    function norm(s = "") {
      return s
        .replace(/[^\w\s]|_/g, "") // remove punctuation
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    // If user guessed correct answer, still respond with a short praise (no reveal)
    if (user !== "" && norm(user) === norm(correct)) {
      return res.status(200).json({ reply: "Yes — that's correct! Great job! 🦕💚" });
    }

    // compose base prompt for generating a child-friendly hint
    const basePrompt = (extraInstructions = "") => `
You are Tali — a friendly dinosaur tutor for children (age 5–9).
Be warm, simple, and helpful.

RULES:
- Answer in 1–2 very short sentences (max).
- Never reveal the correct answer.
- Give one concrete hint or strategy a child can try (e.g., "count on fingers", "compare left and right", "group items by twos", "start with the bigger number then add").
- Avoid repeating the exact previous hint.
- If possible, include a tiny actionable step the child can do right now.

Task: "${task}"
Correct answer (do not reveal): "${correctAnswer}"

Previous assistant message (if any): "${lastAssistantText}"
User message: "${user}"

${extraInstructions}

Now produce ONE short child-friendly hint + one encouraging short sentence (if you can), for example:
"Try counting the apples from left to right. You can do it!" 
Do not give the exact answer. Only output the hint text.
`.trim();

    // helper: call Gemini
    async function callGemini(prompt) {
      try {
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
            process.env.GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            }),
          }
        );
        const d = await r.json();
        return d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      } catch (err) {
        console.error("Gemini call error:", err);
        return null;
      }
    }

    // Try up to 3 times:
    // 1) normal prompt
    // 2) if equal to last -> ask to paraphrase and include concrete action
    // 3) if still equal or empty -> ask to be more concrete (explicit action)
    let attempt = 0;
    let hint = null;
    const lastNorm = norm(lastAssistantText);

    while (attempt < 3 && (!hint || norm(hint) === lastNorm)) {
      attempt++;
      let extra = "";
      if (attempt === 2) {
        extra = "IMPORTANT: Your hint must NOT repeat previous hint. Make it different and include a concrete action (for example: 'count on fingers', 'compare groups', 'draw and count', 'use small jumps').";
      } else if (attempt === 3) {
        extra = "IMPORTANT: Be even more concrete: include a short step-by-step action (one action). Keep it extremely short and child-friendly.";
      }
      hint = await callGemini(basePrompt(extra));
      // small safety trim
      if (hint) hint = hint.replace(/\s+/g, " ").trim();
    }

    // If still empty or equals last, try simple paraphrase of lastAssistantText
    if ((!hint || norm(hint) === lastNorm) && lastAssistantText) {
      const paraphrasePrompt = `
Paraphrase this hint for a young child in 1–2 short sentences and include a concrete action:
"${lastAssistantText}"
Do not repeat exact words, be different and short.
`;
      hint = await callGemini(paraphrasePrompt);
      if (hint) hint = hint.replace(/\s+/g, " ").trim();
    }

    // Final fallback: construct a minimal concrete hint from task keywords (very generic)
    if (!hint || hint.length < 3 || norm(hint) === lastNorm) {
      // Try to generate a basic rule-based hint derived from the task string (best-effort)
      const fallbackAction = (() => {
        const t = task.toLowerCase();
        if (t.includes("add") || t.includes("+") || t.includes("sum") || t.match(/\d+\s*\+\s*\d+/)) {
          return "Try adding the smaller number to the bigger one step by step.";
        }
        if (t.includes("compare") || t.includes("which is bigger") || t.includes("more")) {
          return "Look at both sides and see which group has more items.";
        }
        if (t.includes("how many") || t.includes("count")) {
          return "Count slowly from left to right, using your fingers if needed.";
        }
        if (t.includes("odd") || t.includes("one different") || t.includes("different shape")) {
          return "Look for the shape that looks different from the others.";
        }
        // generic fallback
        return "Try counting slowly on your fingers and compare the groups.";
      })();

      // attach encouragement
      hint = `${fallbackAction} You can do it!`;
    }

    // final safety: ensure we never return the exact correct answer
    if (norm(hint) === norm(correct)) {
      hint = hint + " (try a different way)";
    }

    return res.status(200).json({ reply: hint });
  } catch (err) {
    console.error("Chat backend error:", err);
    return res.status(500).json({ reply: "Tali is confused right now 🦕💫" });
  }
}
