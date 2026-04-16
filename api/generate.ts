export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing GROQ_API_KEY" }));
    return;
  }

  let prompt = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    prompt = String(body?.prompt ?? "");
  } catch {
    prompt = "";
  }

  if (!prompt.trim()) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing prompt" }));
    return;
  }

  const models = [
    process.env.GROQ_MODEL,
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
  ].filter((m): m is string => Boolean(m && m.trim()));

  const uniqueModels = Array.from(new Set(models));

  let lastStatus = 500;
  let lastDetails = "";
  let chosenModel = uniqueModels[0] ?? "";
  let text = "";

  for (const model of uniqueModels) {
    chosenModel = model;
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 450,
      }),
    });

    if (!upstream.ok) {
      lastStatus = upstream.status;
      lastDetails = await upstream.text();
      const detailsLower = lastDetails.toLowerCase();

      const looksLikeModelIssue =
        detailsLower.includes("model_decommissioned") ||
        detailsLower.includes("has been decommissioned") ||
        detailsLower.includes("invalid model") ||
        detailsLower.includes("model not found");

      if (looksLikeModelIssue) {
        continue;
      }

      break;
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      lastStatus = 502;
      lastDetails = "Empty response from model";
      continue;
    }

    break;
  }

  if (!text) {
    res.statusCode = lastStatus || 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: lastDetails || "Upstream error", model: chosenModel }));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ text, model: chosenModel }));
}
