import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEvent } from "@/hooks/useEvents";

export function useCorrectionAccess(eventId: string | null) {
  const { isAdmin } = useAuth();
  const { event } = useCurrentEvent();
  const [now, setNow] = useState(() => Date.now());
  const deadline = event?.athletes_lock_at ? Date.parse(event.athletes_lock_at) : null;
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null || !Number.isFinite(deadline)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.max(deadline - Date.now() + 1, 0), 2147483647));
    return () => window.clearTimeout(timer);
  }, [deadline, now]);
  const ready = !!eventId && event?.id === eventId;
  return ready && (isAdmin || deadline === null || (Number.isFinite(deadline) && deadline > now));
}