import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { isUniqueViolation, query, run, ts, withConnection, withTransaction } from "@/lib/oracle";

const createSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  tipo: z.enum(["barberia", "peluqueria", "gimnasio", "otro"]),
  meta: z.number().int().min(1).max(1000)
});
const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["entregar", "activar", "desactivar"])
});

type AliadoRow = {
  id: string;
  nombre: string;
  tipo: string;
  codigo: string;
  meta: number;
  compras: number;
  beneficios_entregados: number;
  active: number;
  created_at: string;
};

const COLUMNS = `id, nombre, tipo, codigo, meta, compras, beneficios_entregados, active, ${ts("created_at")} AS created_at`;

const toAliado = (r: AliadoRow) => ({
  ...r,
  active: r.active === 1,
  pendientes: Math.max(0, Math.floor(r.compras / r.meta) - r.beneficios_entregados)
});

const noAuth = () => NextResponse.json({ error: "No autorizado." }, { status: 401 });

export async function GET() {
  if (!(await isAdminSessionValid())) return noAuth();
  try {
    const rows = await withConnection((conn) =>
      query<AliadoRow>(conn, `SELECT ${COLUMNS} FROM aliados ORDER BY created_at DESC`)
    );
    return NextResponse.json({ aliados: rows.map(toAliado) });
  } catch (error) {
    console.error("Aliados GET:", error);
    return NextResponse.json({ error: "No fue posible consultar los aliados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return noAuth();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del aliado." }, { status: 400 });
  const { nombre, tipo, meta } = parsed.data;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomUUID();
    const codigo = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    try {
      const created = await withTransaction(async (conn) => {
        await run(
          conn,
          `INSERT INTO aliados (id, nombre, tipo, codigo, meta) VALUES (:v_id, :v_nombre, :v_tipo, :v_codigo, :v_meta)`,
          { v_id: id, v_nombre: nombre, v_tipo: tipo, v_codigo: codigo, v_meta: meta }
        );
        const rows = await query<AliadoRow>(conn, `SELECT ${COLUMNS} FROM aliados WHERE id = :v_id`, { v_id: id });
        return rows[0];
      });
      return NextResponse.json({ aliado: toAliado(created) }, { status: 201 });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        console.error("Aliados POST:", error);
        return NextResponse.json({ error: "No fue posible crear el aliado." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "No se pudo generar un código único. Intenta de nuevo." }, { status: 409 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSessionValid())) return noAuth();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  const { action } = parsed.data;
  const id = parsed.data.id.toLowerCase();

  try {
    const affected = await withTransaction((conn) =>
      action === "entregar"
        ? run(
            conn,
            `UPDATE aliados SET beneficios_entregados = beneficios_entregados + 1
              WHERE id = :v_id AND beneficios_entregados + 1 <= FLOOR(compras / meta)`,
            { v_id: id }
          )
        : run(conn, `UPDATE aliados SET active = :v_active WHERE id = :v_id`, {
            v_active: action === "activar" ? 1 : 0,
            v_id: id
          })
    );
    if (affected === 0) {
      return NextResponse.json({ error: "No hay beneficios pendientes para entregar." }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Aliados PATCH:", error);
    return NextResponse.json({ error: "No fue posible actualizar el aliado." }, { status: 500 });
  }
}