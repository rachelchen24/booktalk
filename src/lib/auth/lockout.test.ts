import { describe, expect, it } from "vitest";
import { lockedMessage, lockMinutesRemaining } from "./lockout";

const now = new Date("2026-01-01T12:00:00Z");

describe("lockMinutesRemaining", () => {
  it("is 0 when there is no lock", () => {
    expect(lockMinutesRemaining(null, now)).toBe(0);
  });

  it("is 0 once the lock has expired", () => {
    expect(lockMinutesRemaining("2026-01-01T11:59:00Z", now)).toBe(0);
    expect(lockMinutesRemaining("2026-01-01T12:00:00Z", now)).toBe(0);
  });

  it("rounds partial minutes up so we never say 0 while still locked", () => {
    expect(lockMinutesRemaining("2026-01-01T12:00:01Z", now)).toBe(1);
    expect(lockMinutesRemaining("2026-01-01T12:14:30Z", now)).toBe(15);
  });
});

describe("lockedMessage", () => {
  it("uses singular and plural correctly", () => {
    expect(lockedMessage(1)).toContain("1 minute,");
    expect(lockedMessage(15)).toContain("15 minutes,");
  });
});
