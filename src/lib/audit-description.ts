type AuditRecord = {
  action: string;
  old_data?: unknown;
  new_data?: unknown;
};

const fieldLabels: Record<string, string> = {
  name: "Nome", birth_date: "Data de nascimento", gender: "Sexo",
  equipe: "Equipe", city: "Cidade", modality: "Modalidade", category: "Categoria",
  phone: "Telefone", email: "E-mail", bib_number: "Número de peito",
  registration_number: "Número de inscrição", shirt_size: "Tamanho da camiseta",
  kit_type: "Tipo de kit", registration_status: "Situação da inscrição",
  payment_status: "Situação do pagamento", event_date: "Data do evento",
  event_time: "Horário", state: "Estado", address: "Endereço",
  description: "Descrição", status: "Situação", role: "Função",
  can_cancel_deliveries: "Permissão de cancelar entregas",
  can_import_athletes: "Permissão de importar planilhas",
  custom_1: "Campo adicional 1", custom_2: "Campo adicional 2",
  custom_3: "Campo adicional 3", custom_4: "Campo adicional 4", custom_5: "Campo adicional 5",
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function describeAuditRecord(log: AuditRecord) {
  const creation = /^(cadastrou|criou|adicionou|importou)\b/i.test(log.action);
  const alteration = /^(editou|alterou|atualizou|corrigiu|resolveu)\b/i.test(log.action);
  const action = creation ? "CADASTROU" : alteration ? "ALTEROU" : log.action;
  const before = asRecord(log.old_data);
  const after = asRecord(log.new_data);
  const changedFields = alteration && before && after
    ? Object.keys(after).filter((key) => fieldLabels[key] && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    : [];
  const description = [
    creation || alteration ? log.action : "",
    changedFields.length ? `Dados alterados: ${changedFields.map((key) => fieldLabels[key]).join(", ")}.` : "",
  ].filter(Boolean).join(" — ");
  return { action, description: description || "—" };
}