import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/admin-session";
import { dateStr, query, ts, withConnection } from "@/lib/oracle";

type CodeRow = {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  active: number;
  created_at: string;
};

type PersonRow = {
  id: string;
  full_name: string;
  whatsapp: string;
  birth_date: string | null;
  room: string | null;
  reservation_date: string | null;
  start_time: string | null;
  end_time: string | null;
  entered_at: string | null;
  created_at: string;
  code_id: string;
  code: string | null;
};

export async function GET() {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { codes, people } = await withConnection(async (conn) => {
      const codes = await query<CodeRow>(
        conn,
        `SELECT id, code, max_uses, used_count, active, ${ts("created_at")} AS created_at
           FROM coworking_codes ORDER BY created_at DESC`
      );

      const people = await query<PersonRow>(
        conn,
        `SELECT p.id, p.full_name, p.whatsapp,
                ${dateStr("p.birth_date")} AS birth_date,
                p.room,
                ${dateStr("p.reservation_date")} AS reservation_date,
                p.start_time, p.end_time,
                ${ts("p.entered_at")} AS entered_at,
                ${ts("p.created_at")} AS created_at,
                p.code_id, c.code AS code
           FROM coworking_participants p
           LEFT JOIN coworking_codes c ON c.id = p.code_id
          ORDER BY p.created_at DESC
          FETCH FIRST 500 ROWS ONLY`
      );

      return { codes, people };
    });

    return NextResponse.json({
      codes: codes.map((row) => ({ ...row, active: row.active === 1 })),
      // Misma forma que devolvía Supabase: coworking_codes: { code }
      participants: people.map(({ code, ...person }) => ({
        ...person,
        coworking_codes: code ? { code } : null
      }))
    });
  } catch (error) {
    console.error("Coworking admin GET:", error);
    return NextResponse.json({ error: "No fue posible cargar los registros." }, { status: 500 });
  }
}
