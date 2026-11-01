import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ qr_token: z.string().uuid() });

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) return NextResponse.json({ error: "Debes iniciar sesión como administrador." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "El QR no es válido." }, { status: 400 });
  try {
    const { data, error } = await getSupabaseAdmin().rpc("redeem_coworking_qr", { p_qr_token: parsed.data.qr_token });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(result ?? { status: "not_found" });
  } catch (error) {
    console.error("Coworking access:", error);
    return NextResponse.json({ error: "No fue posible validar el QR." }, { status: 500 });
  }
}
