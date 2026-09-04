import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { pendingCount, subscribeQueue, syncQueue } from "@/lib/offline";

export function OnlineIndicator({ className }: { className?: string }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    setPending(pendingCount());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const unsub = subscribeQueue(() => setPending(pendingCount()));
    const onBack = () => void syncQueue();
    window.addEventListener("online", onBack);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("online", onBack);
      unsub();
    };
  }, []);

  const offlinePending = !online || pending > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        offlinePending
          ? "border-warning/40 bg-warning/15 text-warning-foreground"
          : "border-success/30 bg-success/12 text-success",
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", offlinePending ? "bg-warning" : "bg-success")}
        aria-hidden
      />
      {online
        ? pending > 0
          ? `Sincronizando ${pending}`
          : "Online"
        : `Offline${pending > 0 ? ` — ${pending} pendente(s)` : ""}`}
    </span>
  );
}
