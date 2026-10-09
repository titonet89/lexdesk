import { expect, test } from "@playwright/test";
import { toWhatsAppNumber, whatsAppLink } from "../../lib/panel/phone";

test.describe("teléfonos argentinos → WhatsApp", () => {
  const cases: [string, string | null][] = [
    ["0388 15-412-3456", "5493884123456"],
    ["388 15 412 3456", "5493884123456"],
    ["388 412-3456", "5493884123456"],
    ["(011) 15-2345-6789", "5491123456789"],
    ["11 2345 6789", "5491123456789"],
    ["+54 9 11 2345-6789", "5491123456789"],
    ["+54 11 2345-6789", "5491123456789"],
    ["03754 15 41-2345", "5493754412345"],
    ["4123456", null],
    ["", null],
    ["no tiene", null],
  ];

  for (const [input, expected] of cases) {
    test(`"${input}" → ${expected ?? "sin WhatsApp"}`, () => {
      expect(toWhatsAppNumber(input)).toBe(expected);
    });
  }

  test("arma el enlace con mensaje codificado", () => {
    expect(whatsAppLink("388 412-3456", "Hola María")).toBe("https://wa.me/5493884123456?text=Hola%20Mar%C3%ADa");
    expect(whatsAppLink(null)).toBeNull();
  });
});
