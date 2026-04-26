"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTIONS = [
  "What is a deductible?",
  "How does my physiotherapy coverage work?",
  "What's an out-of-pocket maximum?",
  "Explain copays in simple terms",
  "How do I submit a claim?",
  "What mental health benefits do I have?",
];

// Built-in fallback responses for common insurance questions
const FALLBACK_MAP: Record<string, string> = {
  deductible: `A **deductible** is the amount you pay out-of-pocket before your insurance starts covering costs. For example, if your deductible is $500, you pay the first $500 of covered expenses each year — after that, insurance kicks in and covers the rest (or a share of it).`,
  copay: `A **copay** (or co-payment) is a fixed amount you pay for a specific service, like $20 per physiotherapy visit. You pay this every time you use that service, even after you've met your deductible. Think of it as your share of the cost at the time of service.`,
  "out-of-pocket": `The **out-of-pocket maximum** is the most you'll ever pay in a plan year. Once you hit that limit (from deductibles, copays, and coinsurance combined), your insurance covers 100% of covered services for the rest of the year. It's your financial safety net.`,
  "out of pocket": `The **out-of-pocket maximum** is the most you'll ever pay in a plan year. Once you hit that limit (from deductibles, copays, and coinsurance combined), your insurance covers 100% of covered services for the rest of the year. It's your financial safety net.`,
  network: `A **provider network** is the group of doctors, clinics, and specialists that have agreed to work with your insurance at negotiated rates. Seeing **in-network** providers is almost always cheaper — out-of-network care can cost significantly more or may not be covered at all.`,
  premium: `Your **premium** is the monthly fee you pay to keep your insurance active — like a subscription. You pay this regardless of whether you use any healthcare services. Lower premiums often come with higher deductibles, and vice versa.`,
  claim: `A **claim** is a request you (or your provider) submit to your insurer asking them to pay for a covered service. Most providers submit claims directly on your behalf. You'll receive an Explanation of Benefits (EOB) showing what was covered and what you owe.`,
  physiotherapy: `Your plan covers **physiotherapy** sessions with a licensed physiotherapist. You typically have a set number of sessions per year (e.g., 10) and an annual allowance (e.g., $600). Check your Savings Dashboard to see exactly how many sessions and how much allowance you have remaining.`,
  "mental health": `Your plan includes **mental health benefits** covering therapy sessions with licensed counselors, psychologists, or psychiatrists. You have a session limit and annual allowance — and under most modern plans, mental health is treated equally to physical health. Check your dashboard for your current usage.`,
  dental: `Your **dental coverage** typically includes preventive care (cleanings, X-rays), basic restorative work (fillings), and sometimes major procedures. Check your Savings Dashboard for your annual allowance and remaining sessions.`,
  vision: `Your **vision benefits** usually cover annual eye exams and a portion of glasses or contact lenses. Coverage varies — check your policy for the exact allowance and whether it covers frames, lenses, contacts, or all three.`,
  prescription: `**Prescription drug coverage** helps pay for medications. Drugs are usually organized into tiers (generic, preferred brand, non-preferred brand) — lower tiers mean lower copays. Always ask your doctor if a generic alternative is available to save money.`,
};

function getFallback(query: string): string | null {
  const q = query.toLowerCase();
  for (const [key, answer] of Object.entries(FALLBACK_MAP)) {
    if (q.includes(key)) return answer;
  }
  return null;
}

function formatTimestamp(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Render basic markdown bold (**text**) to JSX
function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  );
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your PerfectPuls AI assistant powered by Gemini 2.5 Pro. I can help you understand your insurance benefits, explain coverage terms, and answer questions about your policy. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    // Try built-in fallback first if API key may not be set
    const fallback = getFallback(text);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      let replyText: string;
      if (res.ok) {
        const data = await res.json();
        replyText = data.text ?? fallback ?? "I'm not sure, please try rephrasing your question.";
      } else {
        replyText = fallback ?? "I couldn't connect to the AI service right now. Please check that GEMINI_API_KEY is configured in your .env.local file.";
      }

      setMessages([...history, { role: "assistant", content: replyText, timestamp: new Date() }]);
    } catch {
      const errMsg = fallback ?? "Network error — please check your connection and try again.";
      setMessages([...history, { role: "assistant", content: errMsg, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[520px]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">AI Insurance Assistant</h2>
        <p className="text-sm text-gray-500">Powered by Gemini 2.5 Pro — ask anything about your coverage</p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-white rounded-2xl shadow p-5 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant" ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-600"
              }`}
            >
              {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {renderMarkdown(msg.content)}
              </div>
              <span className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-teal-600" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 flex-wrap mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={loading}
            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end bg-white rounded-2xl shadow px-4 py-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your insurance coverage..."
          disabled={loading}
          className="flex-1 resize-none text-sm text-gray-800 outline-none placeholder-gray-400 max-h-32 bg-transparent"
          style={{ overflowY: "auto" }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="w-9 h-9 bg-teal-600 text-white rounded-xl flex items-center justify-center hover:bg-teal-700 transition-colors disabled:opacity-40 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
