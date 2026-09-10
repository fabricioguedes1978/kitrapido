import { MessageCircle, X, Send, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

const CHECKIN_URL = "/checkin";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const FAQ: { question: string; answer: string }[] = [
  {
    question: "Como faço meu check-in?",
    answer:
      "Você pode fazer o check-in clicando no botão \"Check-in do atleta\" no topo do site ou acessando diretamente /checkin. Digite seu CPF, escolha o evento e gere sua credencial com QR Code.",
  },
  {
    question: "O que preciso levar no dia da retirada?",
    answer:
      "Leve um documento com foto válido (RG, CNH ou passaporte). Ele pode ser solicitado pela equipe no local de retirada.",
  },
  {
    question: "Posso retirar o kit de um amigo?",
    answer:
      "Sim, desde que a pessoa esteja autorizada. No ato da entrega, o staff pode marcar \"Retirado por terceiros\" e anotar o nome de quem retirou.",
  },
  {
    question: "Meu pagamento está PENDENTE. Posso retirar o kit?",
    answer:
      "Na hora da retirada, apresente o comprovante de pagamento e um documento com foto. A equipe poderá verificar o pagamento junto ao site de inscrições, na área do atleta, usando o CPF.",
  },
  {
    question: "Meus dados estão errados. Como corrijo?",
    answer:
      "O atendimento virtual não altera dados. Você deve informar ao atendente no local de retirada qual dado está incorreto e solicitar a correção.",
  },
  {
    question: "Onde fica o local de retirada de kit?",
    answer:
      "O endereço, cidade e orientações de retirada estão na sua credencial e no voucher. Na tela de check-in, clique em \"Como chegar\" para abrir o GPS.",
  },
  {
    question: "Perdi o QR Code. E agora?",
    answer:
      "Você pode gerar a credencial novamente acessando o check-in com seu CPF. A credencial pode ser salva como imagem ou PDF.",
  },
  {
    question: "Quais são os horários de retirada do kit?",
    answer:
      "Os horários e dias de retirada são definidos pela organização do evento e estão informados na sua credencial/voucher.",
  },
  {
    question: "É obrigatório documento com foto para retirar o kit?",
    answer:
      "Sim, a equipe pode solicitar RG, CNH ou passaporte para confirmar sua identidade na retirada.",
  },
  {
    question: "Posso retirar o kit por terceiros?",
    answer:
      "Sim. Quem retirar deve apresentar documento com foto e o staff anotará o nome da pessoa que retirou.",
  },
  {
    question: "Posso vender ou transferir minha inscrição/kit?",
    answer:
      "A venda ou transferência depende do regulamento do evento. Consulte o regulamento do evento ou a organização.",
  },
  {
    question: "Comprei uma inscrição de outra pessoa. Posso retirar o kit?",
    answer:
      "Se a transferência for autorizada, a inscrição deve estar no seu nome ou ser informada à organização. Consulte o regulamento do evento ou a organização antes da retirada.",
  },
  {
    question: "Como faço para transferir a titularidade da minha inscrição?",
    answer:
      "O KIT RÁPIDO não realiza transferências. O processo deve ser feito diretamente com a organização, pelo site de inscrições ou canais oficiais.",
  },
  {
    question: "Posso trocar o tamanho da camisa?",
    answer:
      "A troca de tamanho depende da disponibilidade de estoque no local de retirada.",
  },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function addMessage(role: ChatMessage["role"], text: string) {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);
  }

  function handleQuestion(question: string, answer: string) {
    addMessage("user", question);
    setTimeout(() => addMessage("assistant", answer), 150);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    addMessage("user", value);
    setInput("");
    setTimeout(
      () =>
        addMessage(
          "assistant",
          "Para dúvidas específicas, verifique o regulamento do evento ou fale com a organização no local de retirada."
        ),
      150
    );
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
              <p className="text-xs opacity-90">Dúvidas frequentes</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar atendimento">
              <X className="size-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Olá! 👋 Escolha uma pergunta abaixo ou digite sua dúvida.
                </p>
                <Link
                  to={CHECKIN_URL}
                  onClick={() => setOpen(false)}
                  className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Quero fazer meu check-in
                </Link>
                <p className="text-muted-foreground text-xs">
                  No dia da retirada, leve um documento com foto (RG, CNH ou passaporte) — ele pode ser
                  solicitado pela equipe.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2"
                      : "text-foreground max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {messages.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Escolha outra pergunta abaixo ou digite uma nova dúvida.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {FAQ.map((item) => (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => handleQuestion(item.question, item.answer)}
                  className="border-primary/30 text-primary hover:bg-primary/10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors text-left"
                >
                  {item.question}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua dúvida..."
                className="border-input bg-background focus-visible:ring-ring h-10 flex-1 rounded-full border px-4 text-sm outline-none focus-visible:ring-2"
              />
              <Button type="submit" size="icon" className="size-10 shrink-0 rounded-full">
                <Send className="size-4" />
              </Button>
            </form>
            <p className="text-muted-foreground mt-2 text-center text-xs font-medium">
              Dúvidas específicas? Verifique o regulamento do evento ou fale com a organização.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
