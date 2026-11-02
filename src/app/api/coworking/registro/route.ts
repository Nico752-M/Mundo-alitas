
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const validDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
};

const schema = z.object({
  code: z.string().trim().min(4).max(32),
  full_name: z.string().trim().min(3).max(100),
  whatsapp: z.string().trim().min(7).max(20).regex(
    /^[+\d\s().-]+$/,
    "Ingresa un WhatsApp válido."
  ),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(validDate, "La fecha de cumpleaños no es válida.")
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Revisa los datos."
        },
        { status: 400 }
      );
    }

    const qr_token = randomUUID();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc(
      "register_coworking_participant_by_code",
      {
        p_code: parsed.data.code.toUpperCase(),
        p_full_name: parsed.data.full_name,
        p_whatsapp: parsed.data.whatsapp,
        p_qr_token: qr_token,
        p_birth_date: parsed.data.birth_date
      }
    );

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || result.status !== "registered") {
      const messages: Record<string, string> = {
        invalid_code: "El código no existe o está desactivado.",
        code_exhausted: "Este código ya alcanzó su límite de registros.",
        code_without_schedule: "Este código no tiene sala u horario asignado. Consulta con el establecimiento.",
        invalid_schedule: "La fecha de cumpleaños no es válida."
      };

      return NextResponse.json(
        {
          error: messages[result?.status] ??
            "No fue posible completar el registro."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        participant: {
          id: result.id,
          full_name: result.full_name,
          qr_token: result.qr_token,
          birth_date: parsed.data.birth_date,
          room: result.room,
          reservation_date: result.reservation_date,
          start_time: String(result.start_time).slice(0, 5),
          end_time: String(result.end_time).slice(0, 5)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Coworking registration:", error);

    return NextResponse.json(
      {
        error: "El servicio de registro no está disponible. Verifica la configuración de Coworking."
      },
      { status: 500 }
    );
  }
}
