export function AthletePendingValue({ value }: { value?: string | null }) {
  return value?.trim() && value !== "—" ? <>{value}</> : <span className="inline-flex bg-destructive px-1.5 py-0.5 text-sm font-semibold text-destructive-foreground">PENDÊNCIA</span>;
}