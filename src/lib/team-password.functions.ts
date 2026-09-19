import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { teamAuthPassword } from "@/lib/team.functions";

const createResetSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

const useResetSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/),
  code: z.string().regex(/^[A-Z0-9]{8}$/),
  password: z.string().min(1).max(128),
});

function hashCode(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export const createTeamPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createResetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: canManage, error: permissionError } = await context.supabase.rpc("can_manage_event", {
      _event_id: data.eventId,
    });
    if (permissionError || !canManage) throw new Error("Você não pode redefinir acessos deste evento.");

    const { data: target, error: memberError } = await context.supabase
      .from("event_members")
      .select("role")
      .eq("event_id", data.eventId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (memberError || !target) throw new Error("Pessoa não encontrada na equipe deste evento.");

    const { data: callerIsAdmin } = await context.supabase.rpc("is_admin");
    if (target.role === "organizer" && !callerIsAdmin) {
      throw new Error("Somente o administrador pode redefinir a senha de um gerente.");
    }

    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("cpf,name")
      .eq("id", data.userId)
      .maybeSingle();
    const cpf = (profile?.cpf ?? "").replace(/\D/g, "");
    if (profileError || cpf.length !== 11) throw new Error("Esta pessoa não possui um CPF válido cadastrado.");

    const code = randomBytes(4).toString("hex").toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("team_password_resets")
      .update({ status: "revoked" })
      .eq("user_id", data.userId)
      .eq("status", "pending");

    const { data: reset, error: resetError } = await supabaseAdmin
      .from("team_password_resets")
      .insert({
        event_id: data.eventId,
        user_id: data.userId,
        cpf,
        code_hash: hashCode(code),
        requested_by: context.userId,
      })
      .select("id,expires_at")
      .single();
    if (resetError || !reset) throw new Error("Não foi possível gerar o código de recuperação.");

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      event_id: data.eventId,
      action: "Código de redefinição de senha gerado",
      entity: "team_password_reset",
      entity_id: reset.id,
      new_data: { target_user_id: data.userId, target_name: profile?.name ?? null },
    });

    return { code, expiresAt: reset.expires_at };
  });

export const resetTeamPassword = createServerFn({ method: "POST" })
  .inputValidator((input) => useResetSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: match } = await supabaseAdmin
      .from("team_password_resets")
      .select("id,user_id,event_id")
      .eq("cpf", data.cpf)
      .eq("code_hash", hashCode(data.code))
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!match) return { ok: false as const };

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("team_password_resets")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", match.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) return { ok: false as const };

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(match.user_id, {
      password: teamAuthPassword(data.password),
    });
    if (passwordError) throw new Error("Não foi possível salvar a nova senha. Solicite outro código.");

    await supabaseAdmin.from("audit_logs").insert({
      user_id: match.user_id,
      event_id: match.event_id,
      action: "Senha da equipe redefinida",
      entity: "team_password_reset",
      entity_id: match.id,
    });

    return { ok: true as const };
  });