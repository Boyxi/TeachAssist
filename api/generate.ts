export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing GEMINI_API_KEY" }));
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
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro",
  ].filter((m): m is string => Boolean(m && m.trim()));

  const tried = new Set<string>();
  const uniqueModels: string[] = [];
  for (const m of models) {
    if (tried.has(m)) continue;
    tried.add(m);
    uniqueModels.push(m);
  }

  let lastStatus = 500;
  let lastDetails = "";
  let chosenModel = uniqueModels[0] ?? "";
  let data:
    | {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      }
    | null = null;

  for (const model of uniqueModels) {
    chosenModel = model;
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent` + `?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 450,
        },
      }),
    });

    if (upstream.ok) {
      data = (await upstream.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      break;
    }

    lastStatus = upstream.status;
    lastDetails = await upstream.text();
    const detailsLower = lastDetails.toLowerCase();
    const looksLikeModelNotFound =
      lastStatus === 404 ||
      detailsLower.includes("is not found for api version") ||
      (detailsLower.includes("not_found") && detailsLower.includes("models/"));

    if (!looksLikeModelNotFound) {
      break;
    }
  }

  if (!data) {
    res.statusCode = lastStatus || 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: lastDetails || "Upstream error", model: chosenModel }));
    return;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Empty response from model", model: chosenModel }));
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ text, model: chosenModel }));
}
