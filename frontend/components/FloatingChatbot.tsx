"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";

import { queryManual } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

export function FloatingChatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "สวัสดีครับ ผมช่วยตอบคำถามเรื่องการรับประกันและงานซ่อมจากคู่มือที่ระบบมีได้",
    },
  ]);

  const isCustomer = useMemo(() => user?.role === "user", [user?.role]);

  if (!isCustomer) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !user?.id) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await queryManual(trimmed, user.id, user.role ?? "user");
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: response.answer || "ยังไม่พบข้อมูลนี้ในคู่มือที่ระบบมี",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "bot",
          text: "ตอนนี้ยังเชื่อมต่อคลังความรู้ไม่ได้ กรุณาลองใหม่อีกครั้ง",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <section className="w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-red-300" />
              <p className="text-sm font-semibold">ผู้ช่วย AI</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-200 transition hover:bg-white/10"
              aria-label="ปิดแชตบอท"
            >
              <X size={16} />
            </button>
          </header>

          <div className="max-h-72 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-red-700 text-white"
                    : "bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && <p className="text-xs text-slate-500">กำลังคิดคำตอบ...</p>}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="พิมพ์คำถามเกี่ยวกับประกันหรือการซ่อม"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-red-300 focus:ring"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg bg-brandRed px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
              >
                <Send size={14} />
                ส่ง
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              ต้องการคุยแบบเต็มหน้า? <Link href="/support" className="font-semibold text-red-700">ไปที่ผู้ช่วย AI</Link>
            </p>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-slate-800"
          aria-label="เปิดแชตบอท"
        >
          <MessageCircle size={18} className="text-red-300" />
          คุยกับ AI
        </button>
      )}
    </div>
  );
}
