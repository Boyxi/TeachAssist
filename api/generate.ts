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

  const model = (process.env.GROQ_MODEL || "llama3-8b-8192").trim();

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
    const details = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: details, model }));
    return;
  }

  const data = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Empty response from model", model }));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ text, model }));
}
