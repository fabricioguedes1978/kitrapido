import logoAsset from "@/assets/kit-rapido-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  compact = false,
  large = false,
  inverted = false,
  showText = true,
}: {
  className?: string;
  compact?: boolean;
  large?: boolean;
  inverted?: boolean;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm",
          compact
            ? large
              ? "h-16 w-auto sm:h-20"
              : "h-12 w-auto"
            : large
              ? "h-18 w-auto sm:h-22"
              : "h-14 w-auto sm:h-16",
        )}
      >
        <img
          src={logoAsset.url}
          alt="Kit Rápido"
          className="h-full w-auto max-w-full object-contain"
        />
      </span>
      {showText && !compact && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "font-display block truncate text-xl font-extrabold tracking-tight sm:text-2xl",
              inverted ? "text-sidebar-foreground" : "text-foreground",
            )}
          >
            KIT <span className="text-primary">RÁPIDO</span>
          </span>
          <span
            className={cn(
              "block truncate text-[11px] font-medium tracking-[0.18em] uppercase sm:text-xs",
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
