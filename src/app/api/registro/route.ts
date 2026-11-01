
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  full_name: z.string().trim().min(3).max(100),
  whatsapp: z.string().trim().min(7).max(20).regex(/^[+\d\s().-]+$/, "Ingresa un número de WhatsApp válido."),
  instagram: z.string().trim().min(2).max(40).regex(/^@?[a-zA-Z0-9._]+$/, "Ingresa un usuario de Instagram válido."),
  gift: z.enum(["colanta", "papitas", "bebida"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha de cumpleaños.").refine((value) => {
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "La fecha de cumpleaños no es válida.")
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
        { status: 400 }
      );
    }

    const qr_token = randomUUID();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("participants")
      .insert({
        ...parsed.data,
        instagram: parsed.data.instagram.replace(/^@/, ""),
        qr_token
      })
      .select("id, full_name, gift, qr_token")
      .single();

    if (error) {
      console.error("Registration insert error:", error.message);
      return NextResponse.json(
        { error: "No pudimos guardar tu registro. Inténtalo nuevamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ participant: data }, { status: 201 });
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json(
      { error: "El servicio no está configurado o no está disponible." },
      { status: 500 }
    );
  }
}
