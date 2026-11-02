import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const validDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
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
  {
    message: "La hora de finalización debe ser posterior a la hora de inicio.",
    path: ["end_time"]
  }
);
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
    const supabase = getSupabaseAdmin();
    const { room, reservation_date, start_time, end_time } = parsed.data;

    // Comprobar que no se cruce con otro código activo en la misma sala y fecha
    const { data: crossedCodes, error: codesError } = await supabase
      .from("coworking_codes")
      .select("id")
      .eq("active", true)
      .eq("room", room)
      .eq("reservation_date", reservation_date)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
      .limit(1);
    if (codesError) throw codesError;

    // Comprobar que no se cruce con personas ya inscritas en esa sala y fecha
    const { data: crossedPeople, error: peopleError } = await supabase
      .from("coworking_participants")
      .select("id")
      .eq("room", room)
      .eq("reservation_date", reservation_date)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
      .limit(1);
    if (peopleError) throw peopleError;

    if ((crossedCodes?.length ?? 0) > 0 || (crossedPeople?.length ?? 0) > 0) {
      return NextResponse.json({ error: "Esa sala ya está reservada en ese horario. Elige otra sala u otro horario." }, { status: 409 });
    }

    const { data, error } = await supabase.from("coworking_codes")
      .insert({
        code: parsed.data.code.toUpperCase(),
        max_uses: parsed.data.max_uses,
        room,
        reservation_date,
        start_time,
        end_time
      })
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
