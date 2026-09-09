import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, X, Send, Phone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const WHATSAPP_URL = "https://wa.me/5531998966300";

const SUGGESTIONS = [
  "Como faço meu check-in?",
  "Posso retirar o kit de um amigo?",
  "O que preciso levar no dia?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    void sendMessage({ text: value });
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir atendimento"
          className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">Fale com a gente</span>
        </button>
      )}

      {open && (
        <div className="bg-card fixed right-2 bottom-2 z-50 flex h-[min(560px,85vh)] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:right-6 sm:bottom-6">
          <div className="bg-primary text-primary-foreground flex items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="text-sm font-bold">Atendimento KIT RÁPIDO</p>
              <p className="text-xs opacity-90">Ana, assistente virtual · responde na hora</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar atendimento">
              <X className="size-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Olá! 👋 Sou a Ana. Posso te ajudar com check-in, retirada do kit e dúvidas sobre o
                  evento.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="border-primary/30 text-primary hover:bg-primary/10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("")
                .trim();
              if (!text) return null;
              return (
                <div
                  key={m.id}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2"
                        : "text-foreground max-w-[95%] whitespace-pre-wrap"
                    }
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <p className="text-muted-foreground animate-pulse">Digitando...</p>
            )}
            {error && (
              <p className="text-destructive text-xs">
                Não consegui responder agora. Tente novamente ou fale no WhatsApp.
              </p>
            )}
          </div>

          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua dúvida..."
                className="border-input bg-background focus-visible:ring-ring h-10 flex-1 rounded-full border px-4 text-sm outline-none focus-visible:ring-2"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full" disabled={busy}>
                <Send className="size-4" />
              </Button>
            </form>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary mt-2 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Phone className="size-3.5" /> Prefere falar com uma pessoa? Chame no WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
