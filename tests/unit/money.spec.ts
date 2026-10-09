import { expect, test } from "@playwright/test";
import { formatARS, formatUma, parseMoney, roundMoney } from "../../lib/panel/money";

test.describe("montos en pesos", () => {
  const cases: [string, number | null][] = [
    ["892.576,50", 892576.5],
    ["892576,5", 892576.5],
    ["892576.50", 892576.5],
    ["$ 1.000", 1000],
    ["1.234.567", 1234567],
    ["55786", 55786],
    ["", null],
    ["abc", null],
    ["12,345", null],
    ["-100", null],
  ];
  for (const [input, expected] of cases) {
    test(`"${input}" → ${expected}`, () => {
      expect(parseMoney(input)).toBe(expected);
    });
  }

  test("formatea pesos y UMA en castellano", () => {
    expect(formatARS(892576).replace(/\s/g, " ")).toBe("$ 892.576,00");
    expect(formatUma(12.5)).toBe("12,5 UMA");
  });

  test("redondea a centavos sin errores de coma flotante", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(16 * 55786)).toBe(892576);
  });
});
