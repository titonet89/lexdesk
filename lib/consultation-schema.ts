import { z } from "zod";
import type { PracticeAreaId } from "@/lib/site-config";

export const practiceAreaIds = [
  "familia",
  "sucesiones",
  "civil",
  "laboral",
  "violencia-genero",
] as const satisfies readonly PracticeAreaId[];

export const consultationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Ingresá tu nombre (mínimo 2 caracteres)." })
    .max(80, { error: "El nombre es demasiado largo." }),
  phone: z
    .string()
    .trim()
    .min(1, { error: "Ingresá tu número de WhatsApp." })
    .regex(/^[+\d\s()-]+$/, { error: "Usá solo números, espacios o los signos + - ( )." })
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, "").length;
        return digits >= 8 && digits <= 15;
      },
      { error: "Ingresá un número de WhatsApp válido (con característica)." },
    ),
  specialty: z.enum(practiceAreaIds, { error: "Elegí el área de tu consulta." }),
  message: z
    .string()
    .trim()
    .min(10, { error: "Contanos brevemente tu caso (mínimo 10 caracteres)." })
    .max(1000, { error: "El mensaje no puede superar los 1000 caracteres." }),
  consent: z.boolean().refine((value) => value, {
    error: "Necesitamos tu autorización para responderte.",
  }),
});

export type ConsultationInput = z.input<typeof consultationSchema>;
export type ConsultationValues = z.output<typeof consultationSchema>;
