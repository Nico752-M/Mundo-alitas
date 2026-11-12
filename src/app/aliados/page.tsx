"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Plus } from "lucide-react";

type Aliado = {
  id: string;
  nombre: string;
  tipo: string;
  codigo: string;
  meta: number;
  compras: number;
  beneficios_entregados: number;
  active: boolean;
  pendientes: number;
};

const TIPOS = [
  { value: "barberia", label: "Barbería" },
  { value: "peluqueria", label: "Peluquería" },
  { value: "gimnasio", label: "Gimnasio" },
  { value: "otro", label: "Otro" }
];

export default function AliadosPage() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [aliados, setAliados] = useState<Aliado[]>([]);
  const [form, setForm] = useState({ nombre: "", tipo: "barberia", meta: "10" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/aliados", { cache: "no-store" });
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No fue posible cargar los aliados.");
    setAliados(data.aliados ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuthenticated(Boolean(d.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (authenticated) void load().catch((e) => setNotice(e.message));
  }, [authenticated, load]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible iniciar sesión.");
      setPassword("");
      setAuthenticated(true);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error de acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function call(url: string, method: string, body: unknown) {
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.status === 401) {
        setAuthenticated(false);
        throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      }
      if (!res.ok) throw new Error(data.error || "No fue posible completar la acción.");
      await load();
      return data;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error inesperado.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function crear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = await call("/api/aliados", "POST", {
      nombre: form.nombre,
      tipo: form.tipo,
      meta: Number(form.meta)
    });
    if (data) {
      setForm((f) => ({ ...f, nombre: "" }));
      setNotice(`Aliado creado. Código: ${data.aliado.codigo}`);
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

  if (checking) return <main className="operator-page"><div className="operator-loading">MUNDO ALITAS</div></main>;

  if (!authenticated) {
    return (
      <main className="operator-page">
        <header className="simple-header">
          <Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link>
        </header>
        <section className="login-card">
          <p className="eyebrow">ALIADOS</p>
          <h1>ACCESO<br /><em>PRIVADO.</em></h1>
          <form onSubmit={login} className="login-form">
            <label>
              Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
            {notice && <p className="error-message">{notice}</p>}
            <button className="button button-gold submit-button" disabled={busy}>
              {busy ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="operator-page">
      <header className="simple-header">
        <Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link>
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Inicio</Link>
      </header>

      <section style={{ width: "min(760px, calc(100% - 32px))", margin: "30px auto 60px", display: "grid", gap: 18 }}>
        <div>
          <p className="eyebrow">PROGRAMA DE ALIADOS</p>
          <h1 style={{ fontSize: 44, margin: "10px 0" }}>ALIADOS</h1>
        </div>

        {notice && <p className="error-message">{notice}</p>}

        <form className="registration-form" onSubmit={crear}>
          <div className="form-heading"><span>NUEVO ALIADO</span></div>
          <label>
            Nombre del negocio
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Barbería El Patrón" required minLength={2} maxLength={100} />
          </label>
          <label>
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              style={{ height: 47, padding: "0 14px", borderRadius: 4, background: "#0c0d0b", color: "#f4f1e8", border: "1px solid rgba(255,255,255,.13)" }}
            >
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label>
            Compras para ganar un beneficio
            <input type="number" min={1} max={1000} value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: e.target.value }))} required />
          </label>
          <button className="button button-gold submit-button" disabled={busy}>
            Crear aliado <Plus size={16} />
          </button>
        </form>

        {aliados.length === 0 && <p className="muted">Todavía no hay aliados.</p>}

        {aliados.map((a) => (
          <article key={a.id} className="scanner-card" style={{ opacity: a.active ? 1 : 0.55 }}>
            <div className="scanner-card-head">
              <span>{a.nombre.toUpperCase()}</span>
              <span>{a.codigo}</span>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ background: "#fff", padding: 10, borderRadius: 6 }}>
                <QRCodeSVG value={`${base}/a/${a.codigo}`} size={128} level="M" />
              </div>
              <div style={{ lineHeight: 1.9, fontSize: 14 }}>
                <div><strong>{a.compras}</strong> compras · meta {a.meta}</div>
                <div>Beneficios entregados: {a.beneficios_entregados}</div>
                <div style={{ color: a.pendientes > 0 ? "var(--gold-light)" : undefined }}>
                  Beneficios por entregar: <strong>{a.pendientes}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button className="button button-gold" disabled={busy || !a.active} onClick={() => void call("/api/aliados/compra", "POST", { id: a.id })}>
                +1 compra
              </button>
              <button
                className="button"
                style={{ border: "1px solid var(--gold)", color: "var(--gold)", background: "transparent" }}
                disabled={busy || a.pendientes < 1}
                onClick={() => void call("/api/aliados", "PATCH", { id: a.id, action: "entregar" })}
              >
                Entregar beneficio
              </button>
              <button className="text-button" disabled={busy} onClick={() => void call("/api/aliados", "PATCH", { id: a.id, action: a.active ? "desactivar" : "activar" })}>
                {a.active ? "Desactivar" : "Activar"}
              </button>
            </div>
            <p className="privacy-note" style={{ textAlign: "left" }}>{base}/a/{a.codigo}</p>
          </article>
        ))}
      </section>
    </main>
  );
}