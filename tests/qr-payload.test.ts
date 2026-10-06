import { describe, expect, test } from "bun:test";
import { decodeQrPayload } from "../src/lib/qr-payload";

const event = "11111111-1111-4111-8111-111111111111";
const athlete = "22222222-2222-4222-8222-222222222222";
const result = { kind: "athlete", eventId: event, athleteId: athlete };

describe("generated QR credentials", () => {
  test("reads public credentials and internal athlete codes", () => {
    expect(decodeQrPayload(`https://example.com/central?atleta=${athlete}&e=${event}`)).toEqual(result);
    expect(decodeQrPayload(`CRONOCHIP:${event}:${athlete}`)).toEqual(result);
  });
  test("reads authorizations", () => {
    expect(decodeQrPayload(`CRONOCHIP-AUTH:${athlete}`)).toEqual({ kind: "third_party", code: athlete });
    expect(decodeQrPayload(`https://example.com/central?auth=${athlete}`)).toEqual({ kind: "third_party", code: athlete });
  });
  test("USB accepts changed punctuation without changing camera parsing", () => {
    const url = `https>;;example.com;centralWatleta+${athlete}*e+${event}`;
    expect(decodeQrPayload(url)).toBeNull();
    expect(decodeQrPayload(url, true)).toEqual(result);
    expect(decodeQrPayload(`CRONOCHIPÇ${event}Ç${athlete}`, true)).toEqual(result);
    expect(decodeQrPayload(`CRONOCHIP-AUTHÇ${athlete}`, true)).toEqual({ kind: "third_party", code: athlete });
  });
  test("does not consume partial scans or event posters as athlete credentials", () => {
    expect(decodeQrPayload(`https://example.com/central?atleta=${athlete.slice(0, 20)}`, true)).toBeNull();
    expect(decodeQrPayload(`https://example.com/central?atleta=${athlete}&e=${event.slice(0, 20)}`, true)).toBeNull();
    expect(decodeQrPayload(`CRONOCHIP:${event}:${athlete.slice(0, 20)}`, true)).toBeNull();
    expect(decodeQrPayload("https://example.com/evento/corrida/kit", true)).toBeNull();
    expect(decodeQrPayload("arbitrary text", true)).toBeNull();
  });
});