import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const createSchema = z.object({
  code: z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9_-]+$/, "Usa letras, números, guion o guion bajo."),
  max_uses: z.number().int().min(1).max(1000)
});
const updateSchema = z.object({ id: z.string().uuid(), active: z.boolean() });

export async function GET() {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const { data, error } = await getSupabaseAdmin().from("coworking_codes")
      .select("id, code, max_uses, used_count, active, created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ codes: data ?? [] });
  } catch (error) {
    console.error("Coworking codes GET:", error);
    return NextResponse.json({ error: "No fue posible consultar los códigos. Ejecuta primero la migración de Coworking en Supabase." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  try {
    const { data, error } = await getSupabaseAdmin().from("coworking_codes")
      .insert({ code: parsed.data.code.toUpperCase(), max_uses: parsed.data.max_uses })
      .select("id, code, max_uses, used_count, active, created_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "Ese código ya existe. Elige otro." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ code: data }, { status: 201 });
  } catch (error) {
    console.error("Coworking codes POST:", error);
    return NextResponse.json({ error: "No fue posible crear el código." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  try {
    const { error } = await getSupabaseAdmin().from("coworking_codes").update({ active: parsed.data.active }).eq("id", parsed.data.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coworking codes PATCH:", error);
    return NextResponse.json({ error: "No fue posible actualizar el código." }, { status: 500 });
  }
}
