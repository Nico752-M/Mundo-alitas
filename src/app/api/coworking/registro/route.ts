import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  code: z.string().trim().min(4).max(32),
  full_name: z.string().trim().min(3).max(100),
  whatsapp: z.string().trim().min(7).max(20).regex(/^[+\d\s().-]+$/, "Ingresa un WhatsApp válido.")
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  try {
    const qr_token = randomUUID();
    const { data, error } = await getSupabaseAdmin().rpc("register_coworking_participant", {
      p_code: parsed.data.code.toUpperCase(),
      p_full_name: parsed.data.full_name,
      p_whatsapp: parsed.data.whatsapp,
      p_qr_token: qr_token
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || result.status !== "registered") {
      const messages: Record<string, string> = {
        invalid_code: "El código no existe o está desactivado.",
        code_exhausted: "Este código ya alcanzó su límite de registros."
      };
      return NextResponse.json({ error: messages[result?.status] ?? "No fue posible completar el registro." }, { status: 400 });
    }
    return NextResponse.json({ participant: { id: result.id, full_name: result.full_name, qr_token: result.qr_token } }, { status: 201 });
  } catch (error) {
    console.error("Coworking registration:", error);
    return NextResponse.json({ error: "El servicio de registro no está disponible. Verifica que la migración de Coworking esté instalada." }, { status: 500 });
  }
}
