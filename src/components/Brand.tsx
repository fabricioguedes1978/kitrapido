import logoAsset from "@/assets/kit-rapido-logo.png.asset.json";
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
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm",
          compact ? "size-9" : "h-10 w-auto min-w-[5.5rem]",
        )}
      >
        <img
          src={logoAsset.url}
          alt="Kit Rápido"
          className={cn("h-full w-auto object-contain", compact && "max-h-full max-w-full")}
        />
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
