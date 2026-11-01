
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const [codes, participants] = await Promise.all([
      supabase
        .from("coworking_codes")
        .select("id, code, max_uses, used_count, active, created_at")
        .order("created_at", { ascending: false }),

      supabase
        .from("coworking_participants")
        .select(`
          id,
          full_name,
          whatsapp,
          birth_date,
          room,
          reservation_date,
          start_time,
          end_time,
          entered_at,
          created_at,
          code_id,
          coworking_codes(code)
        `)
        .order("created_at", { ascending: false })
        .limit(500)
    ]);

    if (codes.error) throw codes.error;
    if (participants.error) throw participants.error;

    return NextResponse.json({
      codes: codes.data ?? [],
      participants: participants.data ?? []
    });

  } catch (error) {
    console.error("Coworking admin GET:", error);

    return NextResponse.json(
      {
        error: "No fue posible cargar los registros. Verifica la migración de Coworking."
      },
      { status: 500 }
    );
  }
}
