import oracledb from "oracledb";

export type Row = Record<string, unknown>;

type GlobalWithPool = typeof globalThis & { __oraclePool?: Promise<oracledb.Pool> };
const g = globalThis as GlobalWithPool;

async function createPool() {
  const user = process.env.ORACLE_USER;
  const password = process.env.ORACLE_PASSWORD;
  const connectString = process.env.ORACLE_CONNECT_STRING;

  if (!user || !password || !connectString) {
    throw new Error("Faltan ORACLE_USER, ORACLE_PASSWORD u ORACLE_CONNECT_STRING.");
  }

  // Pool pequeño: la base Always Free tiene pocas conexiones disponibles.
  return oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: 0,
    poolMax: 3,
    poolIncrement: 1,
    poolTimeout: 60,
    queueTimeout: 10000
  });
}

function getPool() {
  if (!g.__oraclePool) {
    g.__oraclePool = createPool().catch((error) => {
      g.__oraclePool = undefined;
      throw error;
    });
  }
  return g.__oraclePool;
}

export async function withConnection<T>(work: (conn: oracledb.Connection) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    return await work(conn);
  } finally {
    await conn.close();
  }
}

/** Ejecuta `work` en una transacción: COMMIT si termina bien, ROLLBACK si lanza un error. */
export function withTransaction<T>(work: (conn: oracledb.Connection) => Promise<T>): Promise<T> {
  return withConnection(async (conn) => {
    try {
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback().catch(() => undefined);
      throw error;
    }
  });
}

/** SELECT: devuelve filas con las columnas en minúscula (Oracle las devuelve en mayúscula). */
export async function query<T = Row>(
  conn: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<T[]> {
  const result = await conn.execute<Row>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return (result.rows ?? []).map(
    (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])) as T
  );
}

/** INSERT / UPDATE / DELETE: devuelve cuántas filas afectó. */
export async function run(
  conn: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<number> {
  const result = await conn.execute(sql, binds);
  return result.rowsAffected ?? 0;
}

/** Fecha/hora con zona horaria -> texto ISO en UTC, como lo entregaba Supabase. */
export const ts = (column: string) =>
  `TO_CHAR(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')`;

/** DATE -> 'YYYY-MM-DD'. */
export const dateStr = (column: string) => `TO_CHAR(${column}, 'YYYY-MM-DD')`;

/** Las horas se guardan como 'HH:MM:SS'. Esto convierte 'HH:MM' en 'HH:MM:00'. */
export const normalizeTime = (value: string) => (value.length === 5 ? `${value}:00` : value);

/** ORA-00001: restricción de unicidad violada. */
export const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { errorNum?: number }).errorNum === 1;
