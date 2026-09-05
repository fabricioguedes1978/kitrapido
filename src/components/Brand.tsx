import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="bg-brand-gradient shadow-brand grid size-9 shrink-0 place-items-center rounded-xl">
        <Timer className="text-primary-foreground size-5" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "font-display block truncate text-lg font-bold tracking-tight",
              inverted ? "text-sidebar-foreground" : "text-foreground",
            )}
          >
            KIT <span className="text-primary">RÁPIDO</span>
          </span>
          <span
            className={cn(
              "block truncate text-[10px] font-medium tracking-[0.18em] uppercase",
              inverted ? "text-sidebar-foreground/60" : "text-muted-foreground",
            )}
          >
            Entrega de Kits
          </span>
        </span>
      )}
    </div>
  );
}
