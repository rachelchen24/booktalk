import { describe, expect, it } from "vitest";
import { extractTags, mentionsTag, splitTags, summarizeTags } from "./tags";

describe("extractTags", () => {
  it("finds single-word tags", () => {
    expect(extractTags("@Alice met @Bob at the station")).toEqual(["Alice", "Bob"]);
  });

  it("keeps going through capitalized words for multi-word names", () => {
    expect(extractTags("They rode to @Kiamo Ko at dawn")).toEqual(["Kiamo Ko"]);
    expect(extractTags("@Doctor Who Smith left")).toEqual(["Doctor Who Smith"]);
  });

  it("stops at punctuation or a lowercase word", () => {
    expect(extractTags("@Alice, Bob and Carol")).toEqual(["Alice"]);
    expect(extractTags("@Alice runs away")).toEqual(["Alice"]);
  });

  it("drops possessives", () => {
    expect(extractTags("@Alice's house burned")).toEqual(["Alice"]);
  });

  it("allows lowercase tags", () => {
    expect(extractTags("the @dragon wakes")).toEqual(["dragon"]);
  });

  it("ignores email addresses and a bare @", () => {
    expect(extractTags("email alice@example.com or @ me")).toEqual([]);
  });

  it("dedupes regardless of case, keeping the first spelling", () => {
    expect(extractTags("@Alice and @alice")).toEqual(["Alice"]);
  });

  it("handles accented names", () => {
    expect(extractTags("@Zoë wins")).toEqual(["Zoë"]);
  });
});

describe("splitTags", () => {
  it("splits text into plain parts and tags, losing nothing", () => {
    const parts = splitTags("Then @Alice left @Kiamo Ko.");
    expect(parts).toEqual([
      { text: "Then " },
      { text: "@Alice", tag: "Alice" },
      { text: " left " },
      { text: "@Kiamo Ko", tag: "Kiamo Ko" },
      { text: "." },
    ]);
    expect(parts.map((p) => p.text).join("")).toBe("Then @Alice left @Kiamo Ko.");
  });

  it("keeps the possessive as plain text", () => {
    expect(splitTags("@Alice's map").map((p) => p.text)).toEqual(["@Alice", "'s map"]);
  });
});

describe("summarizeTags", () => {
  it("counts notes per tag, most mentioned first", () => {
    const notes = [{ body: "@Alice and @Bob" }, { body: "@alice again, @Alice twice" }, { body: "@Carol" }];
    expect(summarizeTags(notes)).toEqual([
      { tag: "Alice", count: 2 },
      { tag: "Bob", count: 1 },
      { tag: "Carol", count: 1 },
    ]);
  });
});

describe("mentionsTag", () => {
  it("matches regardless of case", () => {
    expect(mentionsTag("saw @alice today", "Alice")).toBe(true);
    expect(mentionsTag("saw Alice today", "Alice")).toBe(false);
  });
});
