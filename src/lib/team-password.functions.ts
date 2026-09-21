import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { teamAuthPassword } from "@/lib/team.functions";

const createResetSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(10), (value) => alphabet[value % alphabet.length]).join("");
}

export const createTemporaryTeamPassword = createServerFn({ method: "POST" })
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
      .select("name")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError || !profile) throw new Error("Não foi possível localizar esta pessoa.");

    const temporaryPassword = createTemporaryPassword();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: teamAuthPassword(temporaryPassword),
    });
    if (passwordError) throw new Error("Não foi possível gerar a senha temporária.");

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      event_id: data.eventId,
      action: "Senha temporária da equipe gerada",
      entity: "team_access",
      entity_id: data.userId,
      new_data: { target_user_id: data.userId, target_name: profile?.name ?? null },
    });

    return { temporaryPassword };
  });