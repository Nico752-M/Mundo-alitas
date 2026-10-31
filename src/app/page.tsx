"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowDown, ArrowRight, Gift, MapPin, ScanLine } from "lucide-react";

const foodPhotos = {
  wings:  "/images/Bebidas.png",      // abajo izquierda
  chicken: "/images/Hamburguesas.png",  // arriba derecha
  platter: "/images/Plato_alitas.png",  // arriba izquierda
  meal:  "/images/Como_alitas.png",        // abajo derecha y sección "tres pasos"
};

const marqueeItems = [
  "Los reyes de las alitas",
  "8 años conquistando Tuluá",
  "Buen sabor",
  "Buenos momentos",
  "Mejores premios",
  "Un regalo de la casa",
];

const gifts = [
  { name: "1 alita", text: "Una alita para disfrutar con todo el sabor de la casa.", tone: "char" },
  { name: "Papas a la francesa", text: "Una porción para disfrutar en la mesa.", tone: "ember" },
  { name: "Una bebida", text: "El complemento perfecto para tu visita.", tone: "mustard" },
];

const steps = [
  { title: "Regístrate", text: "Déjanos tus datos para participar." },
  { title: "Elige tu regalo", text: "Selecciona el detalle que prefieras." },
  { title: "Presenta tu código", text: "Muéstralo al personal para validar tu regalo." },
];

function Brand() {
  return (
    <Link href="/" className="ma-brand" aria-label="Mundo Alitas, inicio">
      <Image
        src="/logo-mundo-alitas.png"
        alt="Mundo Alitas"
        width={108}
        height={108}
        className="ma-brand-logo"
        priority
      />
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="ma-eyebrow">
      <span aria-hidden="true">✦</span>
      {children}
      <span aria-hidden="true">✦</span>
    </p>
  );
}

export default function Home() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ma-home");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const header = root.querySelector<HTMLElement>(".ma-header");
    const photos = Array.from(root.querySelectorAll<HTMLElement>(".ma-photo"));
    const navLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>(".ma-nav a"));
    const sections = [
      { id: "regalos", link: navLinks.find((link) => link.hash === "#regalos") },
      { id: "experiencia", link: navLinks.find((link) => link.hash === "#experiencia") },
    ];

    let revealObserver: IntersectionObserver | undefined;
    let sectionObserver: IntersectionObserver | undefined;
    let scrollFrame = 0;

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            revealObserver?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      revealItems.forEach((item) => revealObserver?.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    if (!reduceMotion && "IntersectionObserver" in window) {
      sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sections.forEach(({ id, link }) => {
            link?.classList.toggle("is-active", id === entry.target.id);
            if (id === entry.target.id) link?.setAttribute("aria-current", "location");
            else link?.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-32% 0px -52% 0px", threshold: 0 });
      sections.forEach(({ id }) => {
        const section = root.querySelector<HTMLElement>(`#${id}`);
        if (section) sectionObserver?.observe(section);
      });
    }

    const updateScrollState = () => {
      scrollFrame = 0;
      header?.classList.toggle("is-scrolled", window.scrollY > 24);
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty("--ma-scroll-progress", `${Math.min(1, Math.max(0, window.scrollY / scrollable))}`);
      if (reduceMotion || window.innerWidth < 700) {
        photos.forEach((photo) => photo.style.setProperty("--ma-parallax", "0px"));
        return;
      }
      const viewport = window.innerHeight || 1;
      photos.forEach((photo, index) => {
        const rect = photo.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - viewport / 2) / viewport;
        const strength = index % 2 === 0 ? -13 : 13;
        const offset = Math.max(-18, Math.min(18, distance * strength));
        photo.style.setProperty("--ma-parallax", `${offset.toFixed(1)}px`);
      });
    };

    const hero = root.querySelector<HTMLElement>(".ma-hero");
    const onMouseMove = (e: MouseEvent) => {
      if (reduceMotion || window.innerWidth < 900 || !hero) return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      hero.style.setProperty("--ma-mx", x.toFixed(3));
      hero.style.setProperty("--ma-my", y.toFixed(3));
    };
    hero?.addEventListener("mousemove", onMouseMove);

    const onScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
    };
    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      revealObserver?.disconnect();
      sectionObserver?.disconnect();
      hero?.removeEventListener("mousemove", onMouseMove);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <main className="ma-home" id="contenido-principal">
      <a className="ma-skip-link" href="#regalos">Saltar al contenido</a>
      <header className="ma-header">
        <Brand />
        <nav className="ma-nav" aria-label="Navegación principal">
          <a href="#regalos">REGALOS</a>
          <a href="#experiencia">CÓMO PARTICIPAR</a>
        </nav>
        <Link href="/registro" className="ma-btn ma-btn-header">
          PARTICIPAR <ArrowRight size={16} />
        </Link>
      </header>

      <section className="ma-hero" aria-labelledby="hero-title">
        <div className="ma-hero-inner">
          <div className="ma-photo ma-photo-top-left" data-reveal="photo" role="img" aria-label="Alitas servidas para compartir" style={{ backgroundImage: `url(${foodPhotos.platter})` }} />
          <div className="ma-photo ma-photo-top-right" data-reveal="photo" role="img" aria-label="Pollo crujiente recién preparado" style={{ backgroundImage: `url(${foodPhotos.chicken})` }} />
          <div className="ma-photo ma-photo-bottom-left" data-reveal="photo" role="img" aria-label="Plato de alitas de la casa" style={{ backgroundImage: `url(${foodPhotos.wings})` }} />
          <div className="ma-photo ma-photo-bottom-right" data-reveal="photo" role="img" aria-label="Comida para disfrutar" style={{ backgroundImage: `url(${foodPhotos.meal})` }} />

          <div className="ma-hero-center" data-reveal="hero">
            <Eyebrow>EL SABOR TIENE REYES</Eyebrow>
            <h1 id="hero-title">
              <span>ALITAS</span>
              <span className="ma-title-second">QUE REINAN</span>
            </h1>
            <p className="ma-hero-subtitle">Ven por tus favoritas. Quédate por la experiencia.</p>
            <div className="ma-hero-actions" data-reveal data-delay="1">
              <Link href="/registro" className="ma-btn ma-btn-primary">QUIERO PARTICIPAR <ArrowRight size={17} /></Link>
              <a href="#regalos" className="ma-btn ma-btn-ghost">DESCUBRIR REGALOS <ArrowDown size={16} /></a>
            </div>
          </div>
        </div>
      </section>

      <div className="ma-marquee" aria-hidden="true">
        <div className="ma-marquee-track">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      <section className="ma-gifts-section" id="regalos">
        <div className="ma-intro" data-reveal>
          <div>
            <Eyebrow>LOS REGALOS</Eyebrow>
            <h2>UN DETALLE<br />DE LA CASA.</h2>
          </div>
          <p>Queremos agradecerte por elegirnos. Regístrate y selecciona uno de los regalos disponibles para esta experiencia.</p>
        </div>

        <div className="ma-gifts">
          {gifts.map((gift, i) => (
            <article key={gift.name} className={`ma-card ma-card-${gift.tone}`} data-reveal data-delay={i}>
              <div className="ma-card-top">
                <span className="ma-card-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ma-card-icon"><Gift size={26} /></span>
              </div>
              <div>
                <h3>{gift.name}</h3>
                <p>{gift.text}</p>
                <span className="ma-card-stamp">REGALO DE LA CASA</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ma-experience" id="experiencia">
        <div className="ma-experience-visual" data-reveal="photo">
          <div className="ma-mask ma-mask-b" style={{ backgroundImage: `url(${foodPhotos.meal})` }} role="img" aria-label="Comida de Mundo Alitas" />
        </div>

        <div className="ma-experience-content" data-reveal>
          <Eyebrow>PARTICIPAR ES SENCILLO</Eyebrow>
          <h2>TU REGALO<br />ESTÁ A TRES PASOS.</h2>
          <ol className="ma-steps">
            {steps.map((step, i) => (
              <li className="ma-step" key={step.title} data-reveal data-delay={i}>
                <span>{i + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
          <Link href="/registro" className="ma-btn ma-btn-primary">COMENZAR REGISTRO <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="ma-closing-cta" aria-labelledby="closing-title" data-reveal>
        <div className="ma-closing-kicker"><span aria-hidden="true">✦</span> UNA EXPERIENCIA PARA COMPARTIR</div>
        <h2 id="closing-title">EL BUEN SABOR<br /><span>TIENE RECOMPENSA.</span></h2>
        <p>Haz parte de Mundo Alitas y disfruta el detalle que tenemos preparado para ti.</p>
        <Link href="/registro" className="ma-btn ma-btn-primary">QUIERO MI REGALO <ArrowRight size={18} /></Link>
      </section>

      <footer className="ma-footer" data-reveal>
        <Brand />
        <p>Gracias por compartir la experiencia.</p>
        <Link href="/canje" className="ma-operator-link"><ScanLine size={16} /> ACCESO DE OPERADOR</Link>
        <div className="ma-footer-meta">
          <span><MapPin size={16} /> Cra. 28 #30-30, Tuluá</span>
          <a href="https://www.instagram.com/mundoalitascolombia/" target="_blank" rel="noopener noreferrer">@mundoalitascolombia</a>
        </div>
        <div className="ma-footer-word" aria-hidden="true">MUNDO ALITAS</div>
      </footer>
    </main>
  );
}