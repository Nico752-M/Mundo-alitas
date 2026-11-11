import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { query, run, ts, withTransaction } from "@/lib/oracle";

const schema = z.object({ qr_token: z.string().uuid() });

type ParticipantRow = {
  full_name: string;
  whatsapp: string;
  instagram: string;
  gift: string;
  redeemed_at: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ error: "Debes iniciar sesión como operador." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "El código QR no es válido." }, { status: 400 });
  const token = parsed.data.qr_token.toLowerCase();

  try {
    const result = await withTransaction(async (conn) => {
      // Equivale a la función redeem_participant de Supabase: un solo UPDATE atómico.
      const updated = await run(
        conn,
        `UPDATE participants SET redeemed_at = SYSTIMESTAMP
          WHERE qr_token = :v_token AND redeemed_at IS NULL`,
        { v_token: token }
      );

      const rows = await query<ParticipantRow>(
        conn,
        `SELECT full_name, whatsapp, instagram, gift,
                ${ts("redeemed_at")} AS redeemed_at,
                ${ts("created_at")} AS created_at
           FROM participants WHERE qr_token = :v_token`,
        { v_token: token }
      );

      if (rows.length === 0) return { status: "not_found" as const };
      return { status: updated > 0 ? ("redeemed" as const) : ("already_redeemed" as const), participant: rows[0] };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Redemption API error:", error);
    return NextResponse.json({ error: "El servicio de canje no está disponible." }, { status: 500 });
  }
}
