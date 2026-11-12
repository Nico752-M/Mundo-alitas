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

type CouponRow = {
  nombre_cliente: string;
  whatsapp: string;
  estado: string;
  usado_en: string | null;
  creado_en: string;
  aliado_nombre: string;
};

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ error: "Debes iniciar sesión como operador." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El código QR no es válido." }, { status: 400 });
  const token = parsed.data.qr_token.toLowerCase();

  try {
    const result = await withTransaction(async (conn) => {
      // Primero se conserva exactamente el flujo existente de premios.
      const updatedPrize = await run(
        conn,
        `UPDATE participants SET redeemed_at = SYSTIMESTAMP
          WHERE qr_token = :v_token AND redeemed_at IS NULL`,
        { v_token: token }
      );

      const prizeRows = await query<ParticipantRow>(
        conn,
        `SELECT full_name, whatsapp, instagram, gift,
                ${ts("redeemed_at")} AS redeemed_at,
                ${ts("created_at")} AS created_at
           FROM participants WHERE qr_token = :v_token`,
        { v_token: token }
      );

      if (prizeRows.length > 0) {
        return {
          type: "prize" as const,
          status: updatedPrize > 0 ? "redeemed" as const : "already_redeemed" as const,
          participant: prizeRows[0]
        };
      }

      // Si no es un QR de premio, se intenta canjear como cupón de aliado.
      const updatedCoupon = await run(
        conn,
        `UPDATE cupones_aliados
            SET estado = 'USADO', usado_en = SYSTIMESTAMP
          WHERE token = :v_token AND estado = 'ACTIVO'`,
        { v_token: token }
      );

      const couponRows = await query<CouponRow>(
        conn,
        `SELECT c.nombre_cliente, c.whatsapp, c.estado,
                ${ts("c.usado_en")} AS usado_en,
                ${ts("c.creado_en")} AS creado_en,
                a.nombre AS aliado_nombre
           FROM cupones_aliados c
           JOIN aliados a ON a.id = c.aliado_id
          WHERE c.token = :v_token`,
        { v_token: token }
      );

      if (couponRows.length === 0) return { type: "unknown" as const, status: "not_found" as const };

      return {
        type: "ally_coupon" as const,
        status: updatedCoupon > 0 ? "redeemed" as const : "already_redeemed" as const,
        coupon: couponRows[0]
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Redemption API error:", error);
    return NextResponse.json({ error: "El servicio de validación no está disponible." }, { status: 500 });
  }
}
