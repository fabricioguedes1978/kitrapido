const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const uuidPattern = new RegExp(`^${UUID}$`, "i");

/** Decode only complete system credentials; USB fallback tolerates changed keyboard punctuation. */
export function decodeQrPayload(raw: string, usb = false) {
  const value = raw.trim().replace(/^[\x00-\x1f]+|[\x00-\x1f]+$/g, "");
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const athleteId = url.searchParams.get("atleta");
      const eventId = url.searchParams.get("e") ?? "";
      if (athleteId && uuidPattern.test(athleteId) && (!eventId || uuidPattern.test(eventId))) {
        return { kind: "athlete" as const, eventId: eventId.toLowerCase(), athleteId: athleteId.toLowerCase() };
      }
      const code = url.searchParams.get("auth");
      if (code && uuidPattern.test(code)) return { kind: "third_party" as const, code: code.toLowerCase() };
    } catch {
      // A USB keyboard layout can change the URL's punctuation.
    }
  }
  const athlete = value.match(new RegExp(`^CRONOCHIP:(${UUID}):(${UUID})$`, "i"));
  if (athlete?.[1] && athlete[2]) {
    return { kind: "athlete" as const, eventId: athlete[1].toLowerCase(), athleteId: athlete[2].toLowerCase() };
  }
  const authorization = value.match(new RegExp(`^CRONOCHIP-AUTH:(${UUID})$`, "i"));
  if (authorization?.[1]) return { kind: "third_party" as const, code: authorization[1].toLowerCase() };

  if (!usb) return null;
  // Read identifiers, never follow the scanned URL. The Central still checks its own event roster.
  const usbAthlete = value.match(new RegExp(`^CRONOCHIP[^a-z0-9]{1,3}(${UUID})[^a-z0-9]{1,3}(${UUID})$`, "i"));
  if (usbAthlete?.[1] && usbAthlete[2]) {
    return { kind: "athlete" as const, eventId: usbAthlete[1].toLowerCase(), athleteId: usbAthlete[2].toLowerCase() };
  }
  const usbAuthorization = value.match(new RegExp(`^CRONOCHIP-AUTH[^a-z0-9]{1,3}(${UUID})$`, "i"));
  if (usbAuthorization?.[1]) return { kind: "third_party" as const, code: usbAuthorization[1].toLowerCase() };
  const usbUrl = value.match(new RegExp(`^https?.*[/;]central.{1,3}atleta[^a-z0-9]{1,3}(${UUID})(?:[^a-z0-9]{1,3}e[^a-z0-9]{1,3}(${UUID}))?$`, "i"));
  if (usbUrl?.[1]) {
    return { kind: "athlete" as const, eventId: usbUrl[2]?.toLowerCase() ?? "", athleteId: usbUrl[1].toLowerCase() };
  }
  return null;
}