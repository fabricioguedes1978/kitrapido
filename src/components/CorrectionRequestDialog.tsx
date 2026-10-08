import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCorrectionAccess } from "@/hooks/useCorrectionAccess";
import { logAudit } from "@/lib/cronochip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function CorrectionRequestDialog({ athlete, open, onOpenChange }: {
  athlete: { id: string; event_id: string; name: string };
  open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const canSubmit = useCorrectionAccess(athlete.event_id);
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!user || !profile || saving || observation.trim().length < 3) return;
    if (!canSubmit) { toast.error("O prazo para registrar pendências neste evento encerrou."); return; }
    if (!navigator.onLine) { toast.error("Conecte-se à internet para enviar a pendência."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("athlete_correction_requests").insert({ event_id: athlete.event_id, athlete_id: athlete.id, observation: observation.trim(), requested_by: user.id, requested_by_name: profile.name });
      if (error) throw error;
      void logAudit({ eventId: athlete.event_id, action: "Pendência registrada", entity: "athletes", entityId: athlete.id, newData: { observation: observation.trim() }, userName: profile.name });
      await qc.invalidateQueries({ queryKey: ["correction-requests", athlete.event_id] });
      setObservation(""); onOpenChange(false);
      toast.success("Pendência enviada ao gerente e administrador.");
    } catch { toast.error("Não foi possível enviar a pendência. Tente novamente."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar pendência</DialogTitle><DialogDescription>{athlete.name}</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label htmlFor="correction-observation">Observação / correção solicitada</Label>
        <Textarea id="correction-observation" disabled={!canSubmit || saving} value={observation} onChange={(e) => setObservation(e.target.value)} maxLength={2000} rows={5} placeholder="Ex.: nascimento correto: 15/03/1990; equipe: Corredores Unidos." />
        {!canSubmit && <p className="text-sm text-destructive">Prazo para registrar pendências encerrado.</p>}
      </div>
      <DialogFooter><Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!canSubmit || saving || observation.trim().length < 3} onClick={() => void submit()}>{saving ? "Enviando…" : "Enviar pendência"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}