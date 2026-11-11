import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { query, run, ts, withTransaction } from "@/lib/oracle";

const schema = z.object({ qr_token: z.string().uuid() });

type PersonRow = { full_name: string; whatsapp: string; entered_at: string | null };

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "Debes iniciar sesión como administrador." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "El QR no es válido." }, { status: 400 });
  const token = parsed.data.qr_token.toLowerCase();

  try {
    const result = await withTransaction(async (conn) => {
      // Equivale a redeem_coworking_qr: marca la entrada solo si aún no se había marcado.
      const updated = await run(
        conn,
        `UPDATE coworking_participants SET entered_at = SYSTIMESTAMP
          WHERE qr_token = :v_token AND entered_at IS NULL`,
        { v_token: token }
      );

      const rows = await query<PersonRow>(
        conn,
        `SELECT full_name, whatsapp, ${ts("entered_at")} AS entered_at
           FROM coworking_participants WHERE qr_token = :v_token`,
        { v_token: token }
      );

      if (rows.length === 0) return { status: "not_found" as const };
      return { status: updated > 0 ? ("entered" as const) : ("already_entered" as const), ...rows[0] };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Coworking access:", error);
    return NextResponse.json({ error: "No fue posible validar el QR." }, { status: 500 });
  }
}
