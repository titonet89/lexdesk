import { expect, test } from "@playwright/test";
import { layoutDay, minutePosition } from "../../lib/panel/week-layout";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

test.describe("grilla semanal", () => {
  test("ubica un evento según su horario (7 a 21 h)", () => {
    const [item] = layoutDay([{ id: "a", start: at(14), end: at(15) }]);
    expect(item.top).toBeCloseTo(50, 5); // 14 h es la mitad entre 7 y 21
    expect(item.height).toBeCloseTo((60 / 840) * 100, 5);
    expect(item.lanes).toBe(1);
  });

  test("los eventos superpuestos van en carriles lado a lado", () => {
    const items = layoutDay([
      { id: "a", start: at(9), end: at(11) },
      { id: "b", start: at(10), end: at(12) },
      { id: "c", start: at(11), end: at(12) },
    ]);
    const lane = (id: string) => items.find((item) => item.id === id)!;
    expect(lane("a").lanes).toBe(2);
    expect(lane("a").lane).toBe(0);
    expect(lane("b").lane).toBe(1);
    // "c" empieza cuando termina "a": reutiliza su carril.
    expect(lane("c").lane).toBe(0);
  });

  test("eventos que no se tocan no comparten grupo", () => {
    const items = layoutDay([
      { id: "a", start: at(9), end: at(10) },
      { id: "b", start: at(15), end: at(16) },
    ]);
    expect(items.every((item) => item.lanes === 1)).toBe(true);
  });

  test("los eventos fuera del horario visible se recortan y se marcan", () => {
    const [early] = layoutDay([{ id: "a", start: at(6), end: at(8) }]);
    expect(early.top).toBe(0);
    expect(early.clippedStart).toBe(true);
    const [late] = layoutDay([{ id: "b", start: at(20, 30), end: at(23) }]);
    expect(late.clippedEnd).toBe(true);
    expect(late.top + late.height).toBeCloseTo(100, 5);
  });

  test("un evento sin duración ocupa al menos media hora", () => {
    const [item] = layoutDay([{ id: "a", start: at(9), end: at(9) }]);
    expect(item.height).toBeCloseTo((30 / 840) * 100, 5);
  });

  test("línea de hora actual", () => {
    expect(minutePosition(at(7))).toBe(0);
    expect(minutePosition(at(21))).toBe(100);
    expect(minutePosition(at(22))).toBeNull();
  });
});
