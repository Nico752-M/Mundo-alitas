
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LogOut,
  Plus,
  ScanLine,
  ShieldCheck,
  XCircle,
  Users,
  Ticket,
  CalendarDays,
  DoorOpen,
  ArrowRight,
  Clock3
} from "lucide-react";

type Code = {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  active: boolean;
  created_at: string;
};

type Participant = {
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
  coworking_codes?: { code: string } | null;
};

type AccessResult = {
  status: "entered" | "already_entered" | "not_found";
  full_name?: string;
  whatsapp?: string;
  entered_at?: string | null;
};

type AdminView = "home" | "create" | "scanner" | "codes" | "people";

const ROOMS = ["Elon", "Bobadilla", "Raquel", "Rita"];

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

export default function CoworkingAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [codes, setCodes] = useState<Code[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [codeForm, setCodeForm] = useState({ code: "", max_uses: "10" });

  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState<AdminView>("home");
  const [selectedRoom, setSelectedRoom] = useState("Elon");

  const [scannerActive, setScannerActive] = useState(false);
  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (scanner?.isScanning) {
      try {
        await scanner.stop();
      } catch {
        // La cámara puede haberse detenido previamente.
      }
    }

    scannerRef.current = null;
    setScannerActive(false);
  }, []);

  const loadData = useCallback(async () => {
    const response = await fetch("/api/coworking/admin", {
      cache: "no-store"
    });

    const data = await response.json();

    if (response.status === 401) {
      setAuthenticated(false);
      throw new Error("La sesión expiró. Inicia sesión nuevamente.");
    }

    if (!response.ok) {
      throw new Error(data.error || "No fue posible cargar los datos.");
    }

    setCodes(data.codes ?? []);
    setParticipants(data.participants ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuthenticated(Boolean(d.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (authenticated) {
      void loadData().catch((err) => setNotice(err.message));
    }
  }, [authenticated, loadData]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  async function changeView(view: AdminView) {
    if (view !== "scanner") {
      await stopScanner();
    }

    setNotice("");
    setActiveView(view);
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setBusy(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No fue posible iniciar sesión.");
      }

      setAuthenticated(true);
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Error de acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await stopScanner();
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setAccessResult(null);
    setActiveView("home");
  }

  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setBusy(true);

    try {
      const response = await fetch("/api/coworking/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeForm.code,
          max_uses: Number(codeForm.max_uses)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No fue posible crear el código.");
      }

      setCodeForm({ code: "", max_uses: "10" });
      setNotice(`Código ${data.code.code} creado correctamente.`);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al crear el código.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCode(code: Code) {
    setNotice("");

    try {
      const response = await fetch("/api/coworking/codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: code.id,
          active: !code.active
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No fue posible actualizar el código.");
      }

      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al actualizar.");
    }
  }

  async function validateAccess(decodedText: string) {
    if (processingRef.current) return;

    processingRef.current = true;
    await stopScanner();
    setBusy(true);
    setAccessResult(null);

    try {
      const response = await fetch("/api/coworking/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: decodedText.trim() })
      });

      const data = await response.json();

      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error("La sesión expiró. Inicia sesión nuevamente.");
      }

      if (!response.ok) {
        throw new Error(data.error || "No fue posible validar el QR.");
      }

      setAccessResult(data as AccessResult);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "No fue posible validar el QR.");
    } finally {
      setBusy(false);
      processingRef.current = false;
    }
  }

  async function startScanner() {
    setNotice("");
    setAccessResult(null);

    try {
      const scanner = new Html5Qrcode("coworking-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1
        },
        (text) => {
          void validateAccess(text);
        },
        () => {}
      );

      setScannerActive(true);
    } catch {
      setNotice(
        "No pudimos activar la cámara. Revisa los permisos y utiliza HTTPS o localhost."
      );
      scannerRef.current = null;
    }
  }

  const roomParticipants = participants.filter(
    (person) => person.room === selectedRoom
  );

  const unassignedParticipants = participants.filter(
    (person) => !person.room || !ROOMS.includes(person.room)
  );

  const activeCodes = codes.filter(
    (code) => code.active && code.used_count < code.max_uses
  ).length;

  const availableSlots = codes.reduce(
    (total, code) => total + Math.max(0, code.max_uses - code.used_count),
    0
  );

  if (checking) {
    return (
      <main className="operator-page">
        <div className="operator-loading">MUNDO ALITAS</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="operator-page">
        <header className="simple-header">
          <Link href="/coworking" className="wordmark">
            MUNDO <span>ALITAS</span>
          </Link>
          <Link href="/coworking" className="back-link">
            <ArrowLeft size={15} /> Coworking
          </Link>
        </header>

        <section className="login-card">
          <div className="operator-symbol">
            <ShieldCheck size={25} />
          </div>
          <p className="eyebrow">ADMINISTRACIÓN COWORKING</p>
          <h1>ACCESO<br /><em>PRIVADO.</em></h1>
          <p className="muted">
            Utiliza la misma contraseña de administración del sistema Mundo Alitas.
          </p>

          <form onSubmit={login} className="login-form">
            <label>
              Contraseña de administrador
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                autoComplete="current-password"
              />
            </label>

            {loginError && <p className="error-message">{loginError}</p>}

            <button className="button button-gold submit-button" disabled={busy}>
              {busy ? "Verificando..." : "Entrar al panel"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="operator-page coworking-admin-page">
      <header className="simple-header">
        <Link href="/coworking" className="wordmark">
          MUNDO <span>ALITAS</span>
        </Link>

        <div className="admin-header-actions">
          <Link href="/coworking" className="back-link">
            <ArrowLeft size={15} /> Coworking
          </Link>
          <button className="text-button" onClick={logout}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </header>

      <section className="coworking-admin-heading">
        <p className="eyebrow">PANEL DE CONTROL</p>
        <h1>GESTIONAR<br /><em>COWORKING.</em></h1>
        <p className="muted">
          Administra los códigos, las reservas y el ingreso de visitantes.
        </p>
      </section>

      <section className="coworking-admin-overview">
        <div className="coworking-overview-item">
          <Ticket size={21} />
          <div>
            <strong>{codes.length}</strong>
            <span>Códigos creados</span>
          </div>
        </div>

        <div className="coworking-overview-item">
          <Users size={21} />
          <div>
            <strong>{participants.length}</strong>
            <span>Personas inscritas</span>
          </div>
        </div>

        <div className="coworking-overview-item">
          <DoorOpen size={21} />
          <div>
            <strong>{activeCodes.length}</strong>
            <span>Códigos disponibles</span>
          </div>
        </div>

        <div className="coworking-overview-item">
          <CalendarDays size={21} />
          <div>
            <strong>{availableSlots}</strong>
            <span>Cupos restantes</span>
          </div>
        </div>
      </section>

      <nav className="coworking-admin-navigation">
        <button
          className={activeView === "home" ? "admin-nav-active" : ""}
          onClick={() => void changeView("home")}
        >
          <span className="admin-nav-icon"><DoorOpen size={22} /></span>
          <span><strong>Inicio</strong><small>Resumen general</small></span>
          <ArrowRight size={17} />
        </button>

        <button
          className={activeView === "create" ? "admin-nav-active" : ""}
          onClick={() => void changeView("create")}
        >
          <span className="admin-nav-icon"><Plus size={22} /></span>
          <span><strong>Crear código</strong><small>Generar nuevos accesos</small></span>
          <ArrowRight size={17} />
        </button>

        <button
          className={activeView === "scanner" ? "admin-nav-active" : ""}
          onClick={() => void changeView("scanner")}
        >
          <span className="admin-nav-icon"><ScanLine size={22} /></span>
          <span><strong>Validador</strong><small>Escanear códigos QR</small></span>
          <ArrowRight size={17} />
        </button>

        <button
          className={activeView === "codes" ? "admin-nav-active" : ""}
          onClick={() => void changeView("codes")}
        >
          <span className="admin-nav-icon"><Ticket size={22} /></span>
          <span><strong>Códigos creados</strong><small>Control de cupos</small></span>
          <ArrowRight size={17} />
        </button>

        <button
          className={activeView === "people" ? "admin-nav-active" : ""}
          onClick={() => void changeView("people")}
        >
          <span className="admin-nav-icon"><Users size={22} /></span>
          <span><strong>Personas inscritas</strong><small>Reservas por sala</small></span>
          <ArrowRight size={17} />
        </button>
      </nav>

      {notice && <p className="coworking-notice">{notice}</p>}

      {activeView === "home" && (
        <section className="coworking-admin-data">
          <div className="coworking-data-heading">
            <div>
              <p className="eyebrow">RESUMEN</p>
              <h2>ESTADO DEL <em>COWORKING.</em></h2>
            </div>
          </div>

          <div className="coworking-home-grid">
            <button onClick={() => void changeView("create")}>
              <Plus size={25} />
              <strong>Crear un código</strong>
              <span>Registra un nuevo código y define su cantidad de usos.</span>
            </button>

            <button onClick={() => void changeView("scanner")}>
              <ScanLine size={25} />
              <strong>Validar una entrada</strong>
              <span>Activa la cámara y verifica el QR de cada visitante.</span>
            </button>

            <button onClick={() => void changeView("codes")}>
              <Ticket size={25} />
              <strong>Consultar códigos</strong>
              <span>Revisa los códigos creados y los cupos disponibles.</span>
            </button>

            <button onClick={() => void changeView("people")}>
              <Users size={25} />
              <strong>Ver personas inscritas</strong>
              <span>Consulta visitantes y reservas organizados por sala.</span>
            </button>
          </div>
        </section>
      )}

      {activeView === "create" && (
        <section className="coworking-admin-data">
          <div className="coworking-data-heading">
            <div>
              <p className="eyebrow">NUEVO ACCESO</p>
              <h2>CREAR <em>CÓDIGO.</em></h2>
            </div>
          </div>

          <div className="scanner-card">
            <div className="scanner-card-head">
              <span><Plus size={17} /> CREAR CÓDIGO</span>
              <span>CUPO CONFIGURABLE</span>
            </div>

            <form className="coworking-create-form" onSubmit={createCode}>
              <label>
                Nombre del código
                <input
                  value={codeForm.code}
                  onChange={(e) =>
                    setCodeForm((v) => ({
                      ...v,
                      code: e.target.value.toUpperCase()
                    }))
                  }
                  placeholder="EJ. COWORKING10"
                  required
                  minLength={4}
                  maxLength={32}
                  pattern="[A-Za-z0-9_-]+"
                />
              </label>

              <label>
                Cantidad de personas
                <input
                  type="number"
                  value={codeForm.max_uses}
                  onChange={(e) =>
                    setCodeForm((v) => ({
                      ...v,
                      max_uses: e.target.value
                    }))
                  }
                  min="1"
                  max="1000"
                  required
                />
              </label>

              <button className="button button-gold submit-button" disabled={busy}>
                {busy ? "Creando..." : "Crear código"} <Plus size={16} />
              </button>
            </form>

            <p className="privacy-note">
              Entrega el código únicamente después de confirmar el pago.
              Cada inscripción consume un cupo.
            </p>
          </div>
        </section>
      )}

      {activeView === "scanner" && (
        <section className="coworking-admin-data">
          <div className="coworking-data-heading">
            <div>
              <p className="eyebrow">CONTROL DE ENTRADA</p>
              <h2>VALIDAR <em>QR.</em></h2>
            </div>
            <span className="live-dot">
              ● {scannerActive ? "CÁMARA ACTIVA" : "EN ESPERA"}
            </span>
          </div>

          <div className="scanner-card">
            <div className="scanner-card-head">
              <span><ScanLine size={17} /> ESCÁNER DE ACCESO</span>
              <span>{scannerActive ? "ACTIVO" : "LISTO"}</span>
            </div>

            <div id="coworking-reader" className="scanner-viewport">
              {!scannerActive && (
                <div className="scanner-placeholder">
                  <Camera size={30} />
                  <span>La cámara aparecerá aquí</span>
                </div>
              )}
            </div>

            {!scannerActive ? (
              <button
                className="button button-gold submit-button"
                onClick={startScanner}
                disabled={busy}
              >
                <Camera size={17} /> Activar cámara
              </button>
            ) : (
              <button
                className="button button-outline submit-button"
                onClick={() => void stopScanner()}
              >
                Detener cámara
              </button>
            )}

            {accessResult && (
              <div
                className={`redemption-result ${
                  accessResult.status === "entered" ? "redeemed" : "not_found"
                }`}
              >
                {accessResult.status === "entered" ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}

                <strong>
                  {accessResult.status === "entered"
                    ? "ENTRADA AUTORIZADA"
                    : accessResult.status === "already_entered"
                      ? "QR YA UTILIZADO"
                      : "QR NO VÁLIDO"}
                </strong>

                {accessResult.full_name && (
                  <>
                    <span className="result-name">{accessResult.full_name}</span>
                    <span>{accessResult.whatsapp}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeView === "codes" && (
        <section className="coworking-admin-data">
          <div className="coworking-data-heading">
            <div>
              <p className="eyebrow">CONTROL DE CUPOS</p>
              <h2>CÓDIGOS <em>CREADOS.</em></h2>
            </div>
            <span>{codes.length} códigos</span>
          </div>

          {codes.length === 0 ? (
            <div className="scanner-card">
              <p className="muted">Todavía no has creado códigos.</p>
              <button
                className="button button-gold"
                onClick={() => void changeView("create")}
              >
                Crear primer código <Plus size={16} />
              </button>
            </div>
          ) : (
            <div className="coworking-code-list">
              {codes.map((code) => {
                const remaining = Math.max(0, code.max_uses - code.used_count);
                const percentage = Math.min(
                  100,
                  (code.used_count / code.max_uses) * 100
                );
                const available = code.active && remaining > 0;

                return (
                  <article className="coworking-code-card" key={code.id}>
                    <div className="coworking-code-card-top">
                      <div>
                        <span className="eyebrow">CÓDIGO DE ACCESO</span>
                        <h3>{code.code}</h3>
                      </div>
                      <span className={available ? "code-status-active" : "code-status-inactive"}>
                        {available ? "Disponible" : "Inactivo / Agotado"}
                      </span>
                    </div>

                    <div className="coworking-code-numbers">
                      <div>
                        <strong>{code.used_count}</strong>
                        <span>Utilizados</span>
                      </div>
                      <div>
                        <strong>{remaining}</strong>
                        <span>Restantes</span>
                      </div>
                      <div>
                        <strong>{code.max_uses}</strong>
                        <span>Cupo total</span>
                      </div>
                    </div>

                    <div className="coworking-progress">
                      <div style={{ width: `${percentage}%` }} />
                    </div>

                    <div className="coworking-code-card-bottom">
                      <span>
                        Creado: {new Date(code.created_at).toLocaleDateString("es-CO")}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => void toggleCode(code)}
                      >
                        {code.active ? "Desactivar código" : "Activar código"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeView === "people" && (
        <section className="coworking-admin-data">
          <div className="coworking-data-heading">
            <div>
              <p className="eyebrow">VISITANTES Y RESERVAS</p>
              <h2>PERSONAS <em>INSCRITAS.</em></h2>
            </div>
            <span>{participants.length} registros</span>
          </div>

          <div className="coworking-room-selector">
            {ROOMS.map((room) => (
              <button
                key={room}
                className={selectedRoom === room ? "room-selected" : ""}
                onClick={() => setSelectedRoom(room)}
              >
                <DoorOpen size={18} />
                <strong>{room}</strong>
                <span>
                  {participants.filter((person) => person.room === room).length}
                </span>
              </button>
            ))}
          </div>

          <div className="coworking-room-heading">
            <div>
              <p className="eyebrow">PERSONAS ASIGNADAS A</p>
              <h3>{selectedRoom}</h3>
            </div>
            <span>{roomParticipants.length} personas</span>
          </div>

          {roomParticipants.length === 0 ? (
            <div className="scanner-card">
              <p className="muted">
                Todavía no hay personas inscritas en la sala {selectedRoom}.
              </p>
            </div>
          ) : (
            <div className="coworking-people-list">
              {roomParticipants.map((person) => (
                <article className="coworking-person-card" key={person.id}>
                  <div className="coworking-person-top">
                    <div>
                      <span className="eyebrow">VISITANTE</span>
                      <h3>{person.full_name}</h3>
                      <span>{person.whatsapp}</span>
                    </div>
                    <span className={person.entered_at ? "person-entered" : "person-pending"}>
                      {person.entered_at ? "Ingresó" : "Pendiente"}
                    </span>
                  </div>

                  <div className="coworking-person-details">
                    <div>
                      <CalendarDays size={17} />
                      <span>
                        <small>Fecha de reserva</small>
                        <strong>{formatDate(person.reservation_date)}</strong>
                      </span>
                    </div>

                    <div>
                      <Clock3 size={17} />
                      <span>
                        <small>Horario reservado</small>
                        <strong>
                          {person.start_time && person.end_time
                            ? `${person.start_time.slice(0, 5)} – ${person.end_time.slice(0, 5)}`
                            : "Sin horario"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="coworking-person-footer">
                    <span>Cumpleaños: {formatDate(person.birth_date)}</span>
                    <span>Código: {person.coworking_codes?.code ?? "—"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {unassignedParticipants.length > 0 && (
            <div className="coworking-unassigned">
              <h3>Registros anteriores sin sala asignada</h3>
              <p>
                Hay {unassignedParticipants.length} registros antiguos que no
                tienen información de reserva.
              </p>
              {unassignedParticipants.map((person) => (
                <div className="coworking-unassigned-person" key={person.id}>
                  <strong>{person.full_name}</strong>
                  <span>{person.whatsapp}</span>
                  <span>{person.coworking_codes?.code ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
