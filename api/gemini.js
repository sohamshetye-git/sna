module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || req.body?.apiKey;
    const model = req.body?.model || "gemini-2.5-flash";

    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not set. Please add it to your Vercel Environment Variables."
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: req.body?.contents || []
      })
    });

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
