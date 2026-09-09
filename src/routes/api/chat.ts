import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a Ana, atendente virtual do KIT RÁPIDO, sistema de gestão e entrega de kits de corridas e eventos esportivos.

Fale sempre em português do Brasil, de forma curta, simpática e objetiva (máximo 4 frases por resposta, use listas quando ajudar).

O que você sabe:
- O atleta faz o check-in em /checkin informando o CPF: o sistema busca os eventos ativos e gera a credencial (voucher) em PNG ou PDF com os dados e um QR Code.
- No dia do evento, o atleta apresenta o QR Code, a equipe escaneia e entrega o kit em segundos. Não é possível retirar o mesmo kit duas vezes.
- Um terceiro pode retirar o kit: a equipe registra o nome de quem retirou.
- Informações de local, endereço, dias e horários da retirada aparecem na credencial do atleta e podem variar por evento.
- Organizadores contam com painel em tempo real, controle de estoque por camiseta, importação de inscritos por planilha, relatórios em Excel, auditoria e modo offline.
- Perfis de acesso: administrador, gerente (por evento) e staff (somente entrega).

Regras:
- Você NÃO tem acesso ao banco de dados. Nunca invente dados de um atleta, número de peito, tamanho de camiseta, horário ou endereço específico. Nesses casos, oriente o atleta a fazer o check-in pelo CPF em /checkin ou consultar a credencial.
- Se a pessoa quiser contratar o sistema, falar com um humano ou tiver um problema que você não resolve, envie o WhatsApp: https://wa.me/5531998966300.
- Nunca peça senha, dados bancários ou documentos além do CPF necessário para o check-in.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.8-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
