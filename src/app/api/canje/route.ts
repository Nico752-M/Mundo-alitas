import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSessionValid } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({ qr_token: z.string().uuid() });

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ error: "Debes iniciar sesión como operador." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "El código QR no es válido." }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("redeem_participant", { p_qr_token: parsed.data.qr_token });
    if (error) {
      console.error("Redemption RPC error:", error.message);
      return NextResponse.json({ error: "No fue posible verificar el premio." }, { status: 500 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || result.status === "not_found") return NextResponse.json({ status: "not_found" });
    return NextResponse.json({
      status: result.status,
      participant: {
        full_name: result.full_name,
        whatsapp: result.whatsapp,
        instagram: result.instagram,
        gift: result.gift,
        redeemed_at: result.redeemed_at,
        created_at: result.created_at
      }
    });
  } catch (error) {
    console.error("Redemption API error:", error);
    return NextResponse.json({ error: "El servicio de canje no está disponible." }, { status: 500 });
  }
}
