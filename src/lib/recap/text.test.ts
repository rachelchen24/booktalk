import { describe, expect, it } from "vitest";
import { cleanLines, cleanRecapText } from "./text";

describe("cleanRecapText", () => {
  it("strips markdown emphasis", () => {
    expect(cleanRecapText("**Alice** finds the *map* in the attic.")).toBe("Alice finds the map in the attic.");
  });

  it("strips leading bullet and number markers", () => {
    expect(cleanRecapText("- Alice leaves home.")).toBe("Alice leaves home.");
    expect(cleanRecapText("• Alice leaves home.")).toBe("Alice leaves home.");
    expect(cleanRecapText("2. Alice leaves home.")).toBe("Alice leaves home.");
  });

  it("removes chatbot openers", () => {
    expect(cleanRecapText("Sure! Alice leaves home.")).toBe("Alice leaves home.");
    expect(cleanRecapText("Here's your recap: Alice leaves home.")).toBe("Alice leaves home.");
  });

  it("leaves normal sentences alone, including ones starting with 'Here'", () => {
    expect(cleanRecapText("Here the story moves to the city.")).toBe("Here the story moves to the city.");
    expect(cleanRecapText("Alice's 2 brothers arrive.")).toBe("Alice's 2 brothers arrive.");
  });

  it("tidies whitespace", () => {
    expect(cleanRecapText("  Alice   leaves\nhome. ")).toBe("Alice leaves home.");
  });
});

describe("cleanLines", () => {
  it("drops empty lines and caps the count", () => {
    expect(cleanLines(["A.", " ", "**B.**", "C.", "D.", "E.", "F."], 5)).toEqual(["A.", "B.", "C.", "D.", "E."]);
  });
});
