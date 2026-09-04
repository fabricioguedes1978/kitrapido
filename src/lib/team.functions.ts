import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TEAM_EMAIL_DOMAIN = "equipe.cronochip.app";

export function cpfLogin(cpf: string) {
  return `${cpf.replace(/\D/g, "")}@${TEAM_EMAIL_DOMAIN}`;
}

type Input = {
  eventId: string;
  cpf: string;
  name: string;
  password: string;
  role: "organizer" | "attendant";
};

export const saveEventTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    const cpf = input.cpf.replace(/\D/g, "");
    if (cpf.length !== 11) throw new Error("Informe um CPF válido com 11 dígitos.");
    if (!input.eventId) throw new Error("Selecione um evento.");
    if (!input.password || input.password.length < 6)
      throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    if (input.role !== "organizer" && input.role !== "attendant")
      throw new Error("Função inválida.");
    return { ...input, cpf, name: input.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: canManage } = await supabase.rpc("can_manage_event", { _event_id: data.eventId });
    if (!canManage) throw new Error("Você não tem permissão para gerenciar a equipe deste evento.");

    if (data.role === "organizer") {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) throw new Error("Somente o administrador pode cadastrar um gerente.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = cpfLogin(data.cpf);

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", data.cpf)
      .maybeSingle();

    let userId = existing?.id ?? null;

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name || data.cpf },
      });
      if (created.error) throw new Error(created.error.message);
      userId = created.data.user!.id;
    }

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, name: data.name || data.cpf, email, cpf: data.cpf },
        { onConflict: "id" },
      );

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    const { data: member } = await supabaseAdmin
      .from("event_members")
      .select("id")
      .eq("event_id", data.eventId)
      .eq("user_id", userId)
      .maybeSingle();

    if (member) {
      await supabaseAdmin.from("event_members").update({ role: data.role }).eq("id", member.id);
    } else {
      await supabaseAdmin
        .from("event_members")
        .insert({ event_id: data.eventId, user_id: userId, role: data.role });
    }

    return { ok: true as const, email, userId };
  });
