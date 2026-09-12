import { useChat } from "@ai-sdk/react";
import { Link } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CHECKIN_URL = "/checkin";
type ChatMode = "fixed" | "ai";

interface FixedMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const FAQ: { question: string; answer: string }[] = [
  { question: "Como faço meu check-in?", answer: "Você pode fazer o check-in clicando no botão \"Check-in do atleta\" no topo do site ou acessando diretamente /checkin. Digite seu CPF, escolha o evento e gere sua credencial com QR Code." },
  { question: "O que preciso levar no dia da retirada?", answer: "Leve um documento com foto válido (RG, CNH ou passaporte). Ele pode ser solicitado pela equipe no local de retirada." },
  { question: "Posso retirar o kit de um amigo?", answer: "Sim, desde que a pessoa esteja autorizada. No ato da entrega, o staff pode marcar \"Retirado por terceiros\" e anotar o nome de quem retirou." },
  { question: "Meu pagamento está PENDENTE. Posso retirar o kit?", answer: "Na hora da retirada, apresente o comprovante de pagamento e um documento com foto. A equipe poderá verificar o pagamento junto ao site de inscrições, na área do atleta, usando o CPF." },
  { question: "Meus dados estão errados. Como corrijo?", answer: "O atendimento virtual não altera dados. Você deve informar ao atendente no local de retirada qual dado está incorreto e solicitar a correção." },
  { question: "Onde fica o local de retirada de kit?", answer: "O endereço, cidade e orientações de retirada estão na sua credencial e no voucher. Na tela de check-in, clique em \"Como chegar\" para abrir o GPS." },
  { question: "Perdi o QR Code. E agora?", answer: "Você pode gerar a credencial novamente acessando o check-in com seu CPF. A credencial pode ser salva como imagem ou PDF." },
  { question: "Quais são os horários de retirada do kit?", answer: "Os horários e dias de retirada são definidos pela organização do evento e estão informados na sua credencial/voucher." },
  { question: "É obrigatório documento com foto para retirar o kit?", answer: "Sim, a equipe pode solicitar RG, CNH ou passaporte para confirmar sua identidade na retirada." },
  { question: "Posso retirar o kit por terceiros?", answer: "Sim. Quem retirar deve apresentar documento com foto e o staff anotará o nome da pessoa que retirou." },
  { question: "Posso vender ou transferir minha inscrição/kit?", answer: "A venda ou transferência depende do regulamento do evento. Consulte o regulamento do evento ou a organização." },
  { question: "Comprei uma inscrição de outra pessoa. Posso retirar o kit?", answer: "Se a transferência for autorizada, a inscrição deve estar no seu nome ou ser informada à organização. Consulte o regulamento do evento ou a organização antes da retirada." },
  { question: "Como faço para transferir a titularidade da minha inscrição?", answer: "O KIT RÁPIDO não realiza transferências. O processo deve ser feito diretamente com a organização, pelo site de inscrições ou canais oficiais." },
  { question: "Posso trocar o tamanho da camisa?", answer: "A troca de tamanho depende da disponibilidade de estoque no local de retirada." },
];

function Intro({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">Olá! Escolha uma pergunta abaixo ou digite sua dúvida.</p>
      <Button asChild variant="secondary" size="sm">
        <Link to={CHECKIN_URL} onClick={onClose}>
          <ExternalLink className="size-3.5" /> Quero fazer meu check-in
        </Link>
      </Button>
      <p className="text-muted-foreground text-xs">No dia da retirada, leve um documento com foto. Ele pode ser solicitado pela equipe.</p>
    </div>
  );
}

function QuestionButtons({ onQuestion, disabled = false, selectedQuestion }: { onQuestion: (question: string) => void; disabled?: boolean; selectedQuestion?: string | undefined }) {
  return (
    <div className="space-y-2 pt-1">
      {FAQ.map((item) => (
        <div key={item.question} className="space-y-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} aria-expanded={selectedQuestion === item.question} className="border-primary/30 text-primary h-auto w-full justify-start whitespace-normal rounded-full py-1.5 text-left text-xs" onClick={(event) => {
            const questionBlock = event.currentTarget.parentElement;
            onQuestion(item.question);
            requestAnimationFrame(() => requestAnimationFrame(() => questionBlock?.scrollIntoView({ block: "nearest", behavior: "smooth" })));
          }}>
            {item.question}
          </Button>
          {selectedQuestion === item.question && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              <MessageResponse>{item.answer}</MessageResponse>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FixedChat({ onClose, notice }: { onClose: () => void; notice?: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<FixedMessage[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  function answer(question: string) {
    const match = FAQ.find((item) => item.question === question);
    if (match) {
      setSelectedQuestion((current) => current === question ? undefined : question);
      setInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    const reply = "Para dúvidas específicas, verifique o regulamento do evento ou fale com a organização no local de retirada.";
    const now = Date.now();
    setMessages((current) => [
      ...current,
      { id: `${now}-user`, role: "user", text: question },
      { id: `${now}-assistant`, role: "assistant", text: reply },
    ]);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-3 px-4 py-4 text-sm">
          {messages.length === 0 && <Intro onClose={onClose} />}
          {notice && <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{notice}</p>}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent className={message.role === "assistant" ? "rounded-lg bg-muted px-3 py-2" : undefined}>
                <MessageResponse>{message.text}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          <QuestionButtons onQuestion={answer} selectedQuestion={selectedQuestion} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ChatComposer input={input} setInput={setInput} inputRef={inputRef} onSubmit={answer} />
    </>
  );
}

function ChatComposer({ input, setInput, inputRef, onSubmit, status, onStop }: {
  input: string;
  setInput: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: (value: string) => void;
  status?: "submitted" | "streaming" | "ready" | "error";
  onStop?: () => void;
}) {
  const busy = status === "submitted" || status === "streaming";
  return (
    <div className="border-t p-3">
      <PromptInput onSubmit={({ text }) => { const value = text.trim(); if (value) onSubmit(value); }}>
        <PromptInputBody>
          <PromptInputTextarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} placeholder="Escreva sua dúvida..." className="min-h-12" />
        </PromptInputBody>
        <PromptInputFooter>
          <span className="text-muted-foreground text-[11px]">Consulte também o regulamento do evento.</span>
          <PromptInputSubmit {...(status ? { status } : {})} {...(onStop ? { onStop } : {})} disabled={!input.trim() && !busy} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

function AiChat({ onClose, onUnavailable }: { onClose: () => void; onUnavailable: () => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/public/chat" }), []);
  const { messages, sendMessage, status, stop } = useChat({
    id: "ana-single-session",
    transport,
    onError: onUnavailable,
  });

  useEffect(() => {
    if (status === "ready" || status === "error") inputRef.current?.focus();
  }, [status]);

  function submit(text: string) {
    setInput("");
    void sendMessage({ text });
  }

  const busy = status === "submitted" || status === "streaming";
  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-3 px-4 py-4 text-sm">
          {messages.length === 0 && <Intro onClose={onClose} />}
          {messages.map((message: UIMessage) => (
            <Message key={message.id} from={message.role}>
              <MessageContent className={message.role === "assistant" ? "rounded-lg bg-muted px-3 py-2" : undefined}>
                {message.parts.map((part, index) => part.type === "text" ? <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse> : null)}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <p className="text-muted-foreground text-xs">Ana está preparando a resposta…</p>}
          {messages.length === 0 && <QuestionButtons onQuestion={submit} disabled={busy} />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ChatComposer input={input} setInput={setInput} inputRef={inputRef} onSubmit={submit} status={status} onStop={() => void stop()} />
    </>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("fixed");
  const [aiUnavailable, setAiUnavailable] = useState(false);

  useEffect(() => {
    void supabase.from("chat_settings").select("mode").eq("id", "global").maybeSingle().then(({ data }) => {
      setMode(data?.mode === "ai" ? "ai" : "fixed");
    });
  }, [open]);

  return (
    <>
      {!open && (
        <Button type="button" onClick={() => setOpen(true)} aria-label="Abrir atendimento" className="fixed right-4 bottom-4 z-50 h-auto rounded-full px-4 py-3 shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6">
          <MessageCircle className="size-5" /><span className="hidden sm:inline">Fale com a gente</span>
        </Button>
      )}
      {open && (
        <section aria-label="Atendimento KIT RÁPIDO" className="bg-card fixed right-2 bottom-2 z-50 flex h-[min(620px,88vh)] w-[min(390px,calc(100vw-1rem))] flex-col overflow-hidden rounded-lg border shadow-2xl sm:right-6 sm:bottom-6">
          <header className="bg-primary text-primary-foreground flex items-center justify-between gap-2 px-4 py-3">
            <div><p className="text-sm font-bold">Ana • KIT RÁPIDO</p><p className="text-xs opacity-90">{mode === "ai" && !aiUnavailable ? "Atendimento com IA" : "Dúvidas frequentes"}</p></div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar atendimento" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><X className="size-5" /></Button>
          </header>
          {mode === "ai" && !aiUnavailable ? (
            <AiChat onClose={() => setOpen(false)} onUnavailable={() => setAiUnavailable(true)} />
          ) : (
            <FixedChat onClose={() => setOpen(false)} {...(aiUnavailable ? { notice: "A IA não está disponível agora. Continue pelas respostas fixas abaixo." } : {})} />
          )}
        </section>
      )}
    </>
  );
}