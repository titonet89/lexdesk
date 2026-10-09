import { expect, test } from "@playwright/test";
import { addBusinessDaysFrom, isoToZonedInput, zonedInputToIso } from "../../lib/panel/dates";

test.describe("cómputo de plazos en días hábiles", () => {
  test("empieza a contar el día hábil siguiente a la notificación", () => {
    // Notificado el lunes 2 de noviembre de 2026 → 3 días: mar 3, mié 4, jue 5.
    expect(addBusinessDaysFrom("2026-11-02", 3, new Set()).dueDate).toBe("2026-11-05");
  });

  test("saltea sábados y domingos", () => {
    // Notificado el viernes 6/11 → 2 días: lun 9, mar 10.
    expect(addBusinessDaysFrom("2026-11-06", 2, new Set()).dueDate).toBe("2026-11-10");
  });

  test("saltea los días inhábiles cargados y los informa", () => {
    const result = addBusinessDaysFrom("2026-11-13", 5, new Set(["2026-11-18"]));
    // vie 13 → 16, 17, (18 inhábil), 19, 20, 23
    expect(result.dueDate).toBe("2026-11-23");
    expect(result.skipped).toEqual(["2026-11-18"]);
  });

  test("saltea una feria judicial completa", () => {
    const feria = new Set<string>();
    for (let day = 13; day <= 24; day += 1) feria.add(`2026-07-${String(day).padStart(2, "0")}`);
    // Notificado el viernes 10/07 → la feria va del 13 al 24 → 1 día: lunes 27/07.
    expect(addBusinessDaysFrom("2026-07-10", 1, feria).dueDate).toBe("2026-07-27");
  });

  test("rechaza cantidades inválidas", () => {
    expect(() => addBusinessDaysFrom("2026-11-02", 0, new Set())).toThrow(RangeError);
    expect(() => addBusinessDaysFrom("2026-11-02", 1.5, new Set())).toThrow(RangeError);
  });
});

test.describe("zona horaria de Jujuy", () => {
  test("convierte la hora local (UTC−3) a UTC y de vuelta", () => {
    const iso = zonedInputToIso("2026-10-08", "09:30");
    expect(iso).toBe("2026-10-08T12:30:00.000Z");
    expect(isoToZonedInput(iso)).toEqual({ date: "2026-10-08", time: "09:30" });
  });

  test("un evento a las 22 h no se corre al día siguiente", () => {
    const iso = zonedInputToIso("2026-10-08", "22:00");
    expect(iso).toBe("2026-10-09T01:00:00.000Z");
    expect(isoToZonedInput(iso).date).toBe("2026-10-08");
  });
});
