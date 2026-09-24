import { createHash, randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { teamAuthPassword } from "@/lib/team.functions";

const issueSchema = z.object({
  action: z.literal("issue"),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

const consumeSchema = z.object({
  action: z.literal("consume"),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  cpf: z.string().regex(/^\d{11}$/),
  password: z.string().min(1).max(128),
});

const requestSchema = z.discriminatedUnion("action", [issueSchema, consumeSchema]);

function corsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const Route = createFileRoute("/api/public/team-password-reset")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const parsed = requestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(request, { error: "Dados inválidos." }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (parsed.data.action === "issue") {
          const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
          if (!bearer) return json(request, { error: "Entre novamente para continuar." }, 401);

          const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearer);
          const requester = authData.user;
          if (authError || !requester) return json(request, { error: "Sua sessão expirou. Entre novamente." }, 401);

          const [{ data: adminRole }, { data: requesterMembership }, { data: targetMembership }] = await Promise.all([
            supabaseAdmin.from("user_roles").select("id").eq("user_id", requester.id).eq("role", "admin").maybeSingle(),
            supabaseAdmin.from("event_members").select("role").eq("event_id", parsed.data.eventId).eq("user_id", requester.id).maybeSingle(),
            supabaseAdmin.from("event_members").select("role").eq("event_id", parsed.data.eventId).eq("user_id", parsed.data.userId).maybeSingle(),
          ]);

          const isAdmin = Boolean(adminRole);
          const isManager = requesterMembership?.role === "organizer";
          if (!targetMembership || (!isAdmin && !isManager)) {
            return json(request, { error: "Você não pode redefinir acessos deste evento." }, 403);
          }
          if (targetMembership.role === "organizer" && !isAdmin) {
            return json(request, { error: "Somente o administrador pode redefinir a senha de um gerente." }, 403);
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("name,cpf")
            .eq("id", parsed.data.userId)
            .maybeSingle();
          const cpf = profile?.cpf?.replace(/\D/g, "") ?? "";
          if (cpf.length !== 11) return json(request, { error: "Não foi possível localizar o CPF desta pessoa." }, 400);

          const token = randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await supabaseAdmin
            .from("team_password_resets")
            .update({ status: "revoked" })
            .eq("user_id", parsed.data.userId)
            .eq("status", "pending");

          const { error: insertError } = await supabaseAdmin.from("team_password_resets").insert({
            event_id: parsed.data.eventId,
            user_id: parsed.data.userId,
            cpf,
            code_hash: tokenHash(token),
            status: "pending",
            requested_by: requester.id,
            expires_at: expiresAt,
          });
          if (insertError) return json(request, { error: "Não foi possível gerar o link de redefinição." }, 500);

          await supabaseAdmin.from("audit_logs").insert({
            user_id: requester.id,
            event_id: parsed.data.eventId,
            action: "Link de redefinição da equipe gerado",
            entity: "team_access",
            entity_id: parsed.data.userId,
            new_data: { target_user_id: parsed.data.userId, target_name: profile?.name ?? null },
          });

          return json(request, { token, expiresAt });
        }

        const { data: reset } = await supabaseAdmin
          .from("team_password_resets")
          .select("id,user_id,event_id,cpf")
          .eq("code_hash", tokenHash(parsed.data.token))
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (!reset || reset.cpf !== parsed.data.cpf) {
          return json(request, { error: "Este link é inválido, expirou ou já foi utilizado." }, 400);
        }

        const usedAt = new Date().toISOString();
        const { data: claimed } = await supabaseAdmin
          .from("team_password_resets")
          .update({ status: "used", used_at: usedAt })
          .eq("id", reset.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (!claimed) return json(request, { error: "Este link já foi utilizado." }, 400);

        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(reset.user_id, {
          password: teamAuthPassword(parsed.data.password),
        });
        if (passwordError) {
          await supabaseAdmin.from("team_password_resets").update({ status: "pending", used_at: null }).eq("id", reset.id);
          return json(request, { error: "Não foi possível alterar a senha. Tente novamente." }, 500);
        }

        await supabaseAdmin.from("audit_logs").insert({
          user_id: reset.user_id,
          event_id: reset.event_id,
          action: "Senha da equipe redefinida por link",
          entity: "team_access",
          entity_id: reset.user_id,
        });

        return json(request, { ok: true });
      },
    },
  },
});