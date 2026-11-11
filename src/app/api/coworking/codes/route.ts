import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { isUniqueViolation, normalizeTime, query, run, ts, withConnection, withTransaction } from "@/lib/oracle";

const validDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  code: z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9_-]+$/, "Usa letras, números, guion o guion bajo."),
  max_uses: z.number().int().min(1).max(1000),
  room: z.enum(["Elon", "Bobadilla", "Raquel", "Rita"]),
  reservation_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(validDate, "La fecha de reserva no es válida."),
  start_time: z.string().regex(timePattern, "La hora de inicio no es válida."),
  end_time: z.string().regex(timePattern, "La hora de finalización no es válida.")
}).refine(
  (data) => data.end_time > data.start_time,
  { message: "La hora de finalización debe ser posterior a la hora de inicio.", path: ["end_time"] }
);
const updateSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

type CodeRow = {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  active: number;
  created_at: string;
};

const toCode = (row: CodeRow) => ({ ...row, active: row.active === 1 });

const CODE_COLUMNS = `id, code, max_uses, used_count, active, ${ts("created_at")} AS created_at`;

export async function GET() {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const rows = await withConnection((conn) =>
      query<CodeRow>(conn, `SELECT ${CODE_COLUMNS} FROM coworking_codes ORDER BY created_at DESC`)
    );
    return NextResponse.json({ codes: rows.map(toCode) });
  } catch (error) {
    console.error("Coworking codes GET:", error);
    return NextResponse.json({ error: "No fue posible consultar los códigos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });

  try {
    const { room, reservation_date, max_uses } = parsed.data;
    // Las horas se guardan como 'HH:MM:SS'; se normalizan para que la comparación de texto sea exacta.
    const start = normalizeTime(parsed.data.start_time);
    const end = normalizeTime(parsed.data.end_time);
    const code = parsed.data.code.toUpperCase();
    const id = randomUUID();

    const outcome = await withTransaction(async (conn) => {
      const overlapBinds = { v_room: room, v_date: reservation_date, v_t_to: end, v_t_from: start };

      // No se puede cruzar con otro código activo en la misma sala y fecha.
      const crossedCodes = await query(
        conn,
        `SELECT id FROM coworking_codes
          WHERE active = 1 AND room = :v_room
            AND reservation_date = TO_DATE(:v_date, 'YYYY-MM-DD')
            AND start_time < :v_t_to AND end_time > :v_t_from
          FETCH FIRST 1 ROWS ONLY`,
        overlapBinds
      );

      // Ni con personas ya inscritas en esa sala y fecha.
      const crossedPeople = await query(
        conn,
        `SELECT id FROM coworking_participants
          WHERE room = :v_room
            AND reservation_date = TO_DATE(:v_date, 'YYYY-MM-DD')
            AND start_time < :v_t_to AND end_time > :v_t_from
          FETCH FIRST 1 ROWS ONLY`,
        overlapBinds
      );

      if (crossedCodes.length > 0 || crossedPeople.length > 0) return { conflict: true as const };

      await run(
        conn,
        `INSERT INTO coworking_codes (id, code, max_uses, room, reservation_date, start_time, end_time)
         VALUES (:v_id, :v_code, :v_max, :v_room, TO_DATE(:v_date, 'YYYY-MM-DD'), :v_t_from, :v_t_to)`,
        { v_id: id, v_code: code, v_max: max_uses, v_room: room, v_date: reservation_date, v_t_from: start, v_t_to: end }
      );

      const rows = await query<CodeRow>(conn, `SELECT ${CODE_COLUMNS} FROM coworking_codes WHERE id = :v_id`, { v_id: id });
      return { created: rows[0] };
    });

    if ("conflict" in outcome) {
      return NextResponse.json({ error: "Esa sala ya está reservada en ese horario. Elige otra sala u otro horario." }, { status: 409 });
    }
    return NextResponse.json({ code: toCode(outcome.created) }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "Ese código ya existe. Elige otro." }, { status: 409 });
    console.error("Coworking codes POST:", error);
    return NextResponse.json({ error: "No fue posible crear el código." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  try {
    await withTransaction((conn) =>
      run(conn, `UPDATE coworking_codes SET active = :v_active WHERE id = :v_id`, {
        v_active: parsed.data.active ? 1 : 0,
        v_id: parsed.data.id.toLowerCase()
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coworking codes PATCH:", error);
    return NextResponse.json({ error: "No fue posible actualizar el código." }, { status: 500 });
  }
}
