import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { query, run, withTransaction } from "@/lib/oracle";

const schema = z.object({ id: z.string().uuid(), nota: z.string().trim().max(200).optional() });

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  const id = parsed.data.id.toLowerCase();

  try {
    const outcome = await withTransaction(async (conn) => {
      const rows = await query<{ id: string }>(
        conn,
        `SELECT id FROM aliados WHERE id = :v_id AND active = 1 FOR UPDATE`,
        { v_id: id }
      );
      if (!rows[0]) return { ok: false as const };

      await run(conn, `INSERT INTO compras_aliado (id, aliado_id, nota) VALUES (:v_cid, :v_id, :v_nota)`, {
        v_cid: randomUUID(),
        v_id: id,
        v_nota: parsed.data.nota ?? null
      });
      await run(conn, `UPDATE aliados SET compras = compras + 1 WHERE id = :v_id`, { v_id: id });
      return { ok: true as const };
    });

    if (!outcome.ok) return NextResponse.json({ error: "El aliado no existe o está desactivado." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Aliados compra:", error);
    return NextResponse.json({ error: "No fue posible registrar la compra." }, { status: 500 });
  }
}