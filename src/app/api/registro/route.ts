import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { run, withTransaction } from "@/lib/oracle";

const schema = z.object({
  full_name: z.string().trim().min(3).max(100),
  whatsapp: z.string().trim().min(7).max(20).regex(/^[+\d\s().-]+$/, "Ingresa un número de WhatsApp válido."),
  instagram: z.string().trim().min(2).max(40).regex(/^@?[a-zA-Z0-9._]+$/, "Ingresa un usuario de Instagram válido."),
  gift: z.enum(["colanta", "papitas", "bebida"])
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });

    const id = randomUUID();
    const qr_token = randomUUID();
    const { full_name, whatsapp, gift } = parsed.data;
    const instagram = parsed.data.instagram.replace(/^@/, "");

    await withTransaction((conn) =>
      run(
        conn,
        `INSERT INTO participants (id, full_name, whatsapp, instagram, gift, qr_token)
         VALUES (:v_id, :v_name, :v_whatsapp, :v_instagram, :v_gift, :v_token)`,
        { v_id: id, v_name: full_name, v_whatsapp: whatsapp, v_instagram: instagram, v_gift: gift, v_token: qr_token }
      )
    );

    return NextResponse.json({ participant: { id, full_name, gift, qr_token } }, { status: 201 });
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json({ error: "No pudimos guardar tu registro. Inténtalo nuevamente." }, { status: 500 });
  }
}
