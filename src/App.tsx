import { useMemo, useRef, useState } from "react";

type ClassType =
  | "Speaking Class"
  | "Grammar Class"
  | "Vocabulary Class"
  | "Reading Class"
  | "General English";

type FeedbackLength =
  | "Short (2-3 sentences)"
  | "Medium (4-5 sentences)"
  | "Long (6-7 sentences)";

type Tone = "Encouraging & Warm" | "Professional & Formal" | "Friendly & Casual";

type PerformanceCategory = {
  title: string;
  items: string[];
};

const CLASS_TYPES: ClassType[] = [
  "Speaking Class",
  "Grammar Class",
  "Vocabulary Class",
  "Reading Class",
  "General English",
];

const LENGTHS: FeedbackLength[] = [
  "Short (2-3 sentences)",
  "Medium (4-5 sentences)",
  "Long (6-7 sentences)",
];

const TONES: Tone[] = [
  "Encouraging & Warm",
  "Professional & Formal",
  "Friendly & Casual",
];

const PERFORMANCE_CATEGORIES: PerformanceCategory[] = [
  {
    title: "Pronunciation & Speaking",
    items: [
      "Great pronunciation",
      "Needs pronunciation work",
      "Speaks with confidence",
      "Needs to speak more",
      "Good intonation",
    ],
  },
  {
    title: "Grammar & Vocabulary",
    items: [
      "Strong grammar skills",
      "Needs grammar improvement",
      "Excellent vocabulary",
      "Limited vocabulary",
      "Good sentence structure",
    ],
  },
  {
    title: "Participation & Attitude",
    items: [
      "Very participative",
      "Shy but improving",
      "Enthusiastic learner",
      "Needs encouragement",
      "Excellent focus",
    ],
  },
  {
    title: "Progress",
    items: [
      "Improved a lot today",
      "Consistent progress",
      "Needs more practice",
      "Making steady progress",
      "Exceeded expectations",
    ],
  },
];

function buildPrompt(input: {
  name: string;
  classType: ClassType;
  length: FeedbackLength;
  tone: Tone;
  performanceItems: string[];
}) {
  const performanceText = input.performanceItems.join("\n");

  return [
    "You are an experienced ESL teacher",
    "writing student feedback for parents.",
    `Write a ${input.length} feedback for a student`,
    `named ${input.name} who attended a ${input.classType} class.`,
    "",
    "Student performance:",
    performanceText,
    "",
    "Requirements:",
    `- Tone: ${input.tone}`,
    "- Write in second person addressing parents (e.g., 'Your child...')",
    "- Be specific about what the student did well",
    "- Give one actionable suggestion for improvement",
    "- End with an encouraging note",
    "- Do NOT use bullet points, write in paragraph form",
    "- Make each feedback unique, avoid repetitive phrases",
  ].join("\n");
}

async function generateWithGemini(prompt: string) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const json = (await response.json()) as unknown;
      details = JSON.stringify(json);
    } catch {
      details = await response.text();
    }
    throw new Error(`Generate error (${response.status}): ${details}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) {
    throw new Error("Generator returned an empty response.");
  }

  return text;
}

export default function App() {
  const [studentName, setStudentName] = useState("");
  const [classType, setClassType] = useState<ClassType>("General English");
  const [selectedPerformance, setSelectedPerformance] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedbackLength, setFeedbackLength] =
    useState<FeedbackLength>("Medium (4-5 sentences)");
  const [tone, setTone] = useState<Tone>("Encouraging & Warm");

  const [nameError, setNameError] = useState<string | null>(null);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copiedTimeoutRef = useRef<number | null>(null);

  const selectedPerformanceList = useMemo(
    () => Array.from(selectedPerformance.values()).sort(),
    [selectedPerformance],
  );

  function togglePerformance(item: string) {
    setSelectedPerformance((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function clearCopiedSoon() {
    if (copiedTimeoutRef.current) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
  }

  function validate() {
    const trimmedName = studentName.trim();
    const hasName = trimmedName.length > 0;
    const hasPerformance = selectedPerformance.size > 0;

    setNameError(hasName ? null : "Please enter student name");
    setPerformanceError(hasPerformance ? null : "Please select at least one performance item");

    return hasName && hasPerformance;
  }

  async function handleGenerate() {
    setRequestError(null);
    setCopied(false);
    if (!validate()) return;

    const prompt = buildPrompt({
      name: studentName.trim(),
      classType,
      length: feedbackLength,
      tone,
      performanceItems: selectedPerformanceList,
    });

    try {
      setIsGenerating(true);
      const text = await generateWithGemini(prompt);
      setFeedback(text);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setRequestError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!feedback) return;
    try {
      await navigator.clipboard.writeText(feedback);
      setCopied(true);
      clearCopiedSoon();
    } catch {
      setRequestError("Copy failed. Please select the text and copy manually.");
    }
  }

  const generateButtonLabel = isGenerating ? "Generating..." : "✨ Generate Feedback";

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/lingobee-logo.svg"
              alt="LingoBee"
              className="h-9 w-auto"
            />
            <div className="text-lg font-semibold text-brand-500">LingoBee</div>
          </div>
          <div className="text-xs sm:text-sm text-slate-600">
            AI Feedback Generator for ESL Teachers
          </div>
        </div>
      </header>

      <main>
        <section className="bg-brand-50">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              AI Co-pilot for ESL Teachers.
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-700 max-w-2xl">
              Stop wasting 2 hours writing the same feedback. Let AI do it for you.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 -mt-8 pb-12">
          <div className="bg-white rounded-2xl shadow-soft p-5 sm:p-8">
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Student Name
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. John"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
                />
                {nameError ? (
                  <p className="mt-2 text-sm text-red-600">{nameError}</p>
                ) : null}
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-slate-900">
                  Class Type
                </legend>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASS_TYPES.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300"
                    >
                      <input
                        type="radio"
                        name="classType"
                        value={t}
                        checked={classType === t}
                        onChange={() => setClassType(t)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className="text-sm text-slate-800">{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="block text-sm font-medium text-slate-900">
                  Student Performance
                </legend>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {PERFORMANCE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.title}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="font-semibold text-slate-900 text-sm">
                        {cat.title}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {cat.items.map((item) => {
                          const id = `${cat.title}-${item}`;
                          const checked = selectedPerformance.has(item);
                          return (
                            <label
                              key={id}
                              className="flex items-start gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePerformance(item)}
                                className="mt-0.5 h-4 w-4 accent-brand-500"
                              />
                              <span className="text-sm text-slate-800">{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {performanceError ? (
                  <p className="mt-3 text-sm text-red-600">{performanceError}</p>
                ) : null}
              </fieldset>

              <fieldset>
                <legend className="block text-sm font-medium text-slate-900">
                  Feedback Length
                </legend>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LENGTHS.map((len) => (
                    <label
                      key={len}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300"
                    >
                      <input
                        type="radio"
                        name="length"
                        value={len}
                        checked={feedbackLength === len}
                        onChange={() => setFeedbackLength(len)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className="text-sm text-slate-800">{len}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="block text-sm font-medium text-slate-900">
                  Tone
                </legend>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TONES.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300"
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={t}
                        checked={tone === t}
                        onChange={() => setTone(t)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className="text-sm text-slate-800">{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-xl bg-brand-500 px-4 py-3 text-white font-semibold hover:bg-brand-600 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      {generateButtonLabel}
                    </span>
                  ) : (
                    generateButtonLabel
                  )}
                </button>
                {requestError ? (
                  <p className="mt-3 text-sm text-red-600">{requestError}</p>
                ) : null}
              </div>

              {feedback ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="text-sm font-semibold text-slate-900">
                    Generated Feedback
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {feedback}
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleCopy}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      {copied ? "Copied!" : "Copy Feedback"}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Regenerate
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14">
          <div className="grid gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">How It Works</h2>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { n: "1", text: "Fill in student details" },
                  { n: "2", text: "Select performance items" },
                  { n: "3", text: "Copy & paste feedback" },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="rounded-xl border border-slate-200 p-4 flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center font-bold">
                      {s.n}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="text-sm font-semibold text-slate-900">Testimonial</div>
              <blockquote className="mt-3 text-slate-800 leading-relaxed">
                “This saves me 2 hours every day! I teach 15 classes and used to spend so much
                time on feedback.”
              </blockquote>
              <div className="mt-3 text-sm text-slate-600">
                — Maria, ESL Teacher, Manila
              </div>
            </div>

            <p className="text-xs text-slate-600">
              LingoBee uses AI to generate feedback templates. Always review and personalize
              before sending to parents.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
