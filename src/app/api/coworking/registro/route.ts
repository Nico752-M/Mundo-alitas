import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { dateStr, query, run, withTransaction } from "@/lib/oracle";

const validDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const schema = z.object({
  code: z.string().trim().min(4).max(32),
  full_name: z.string().trim().min(3).max(100),
  whatsapp: z.string().trim().min(7).max(20).regex(/^[+\d\s().-]+$/, "Ingresa un WhatsApp válido."),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(validDate, "La fecha de cumpleaños no es válida.")
});

type CodeRow = {
  id: string;
  max_uses: number;
  used_count: number;
  room: string | null;
  reservation_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

const messages = {
  invalid_code: "El código no existe o está desactivado.",
  code_exhausted: "Este código ya alcanzó su límite de registros.",
  code_without_schedule: "Este código no tiene sala u horario asignado. Consulta con el establecimiento."
};

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
    }

    const { full_name, whatsapp, birth_date } = parsed.data;
    const code = parsed.data.code.trim().toUpperCase();
    const id = randomUUID();
    const qr_token = randomUUID();

    // Equivale a register_coworking_participant_by_code: todo en una transacción,
    // con la fila del código bloqueada (FOR UPDATE) para que dos personas no usen el último cupo a la vez.
    const outcome = await withTransaction(async (conn) => {
      const codes = await query<CodeRow>(
        conn,
        `SELECT id, max_uses, used_count, room,
                ${dateStr("reservation_date")} AS reservation_date,
                start_time, end_time
           FROM coworking_codes
          WHERE code = :v_code AND active = 1
            FOR UPDATE`,
        { v_code: code }
      );

      const selected = codes[0];
      if (!selected) return { ok: false as const, error: "invalid_code" as const };
      if (selected.used_count >= selected.max_uses) return { ok: false as const, error: "code_exhausted" as const };
      if (!selected.room || !selected.reservation_date || !selected.start_time || !selected.end_time) {
        return { ok: false as const, error: "code_without_schedule" as const };
      }

      await run(
        conn,
        `INSERT INTO coworking_participants
           (id, code_id, full_name, whatsapp, qr_token, birth_date, room, reservation_date, start_time, end_time)
         VALUES
           (:v_id, :v_code_id, :v_name, :v_whatsapp, :v_token, TO_DATE(:v_birth, 'YYYY-MM-DD'),
            :v_room, TO_DATE(:v_res_date, 'YYYY-MM-DD'), :v_t_from, :v_t_to)`,
        {
          v_id: id,
          v_code_id: selected.id,
          v_name: full_name,
          v_whatsapp: whatsapp,
          v_token: qr_token,
          v_birth: birth_date,
          v_room: selected.room,
          v_res_date: selected.reservation_date,
          v_t_from: selected.start_time,
          v_t_to: selected.end_time
        }
      );

      await run(conn, `UPDATE coworking_codes SET used_count = used_count + 1 WHERE id = :v_code_id`, {
        v_code_id: selected.id
      });

      return { ok: true as const, selected };
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: messages[outcome.error] }, { status: 400 });
    }

    const { selected } = outcome;
    return NextResponse.json(
      {
        participant: {
          id,
          full_name,
          qr_token,
          birth_date,
          room: selected.room,
          reservation_date: selected.reservation_date,
          start_time: String(selected.start_time).slice(0, 5),
          end_time: String(selected.end_time).slice(0, 5)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Coworking registration:", error);
    return NextResponse.json({ error: "El servicio de registro no está disponible. Verifica la configuración de Coworking." }, { status: 500 });
  }
}
