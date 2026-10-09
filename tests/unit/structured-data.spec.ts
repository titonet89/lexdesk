import { expect, test } from "@playwright/test";
import { serializeJsonLd } from "../../lib/structured-data";

test("el JSON-LD escapa '<' para que nadie pueda cerrar el <script> (XSS)", () => {
  const output = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  expect(output).not.toContain("</script>");
  expect(output).toContain(String.fromCharCode(92) + "u003c/script>");
  // Sigue siendo JSON válido y conserva el texto original.
  expect(JSON.parse(output).name).toBe("</script><script>alert(1)</script>");
});
