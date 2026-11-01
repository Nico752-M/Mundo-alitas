import Link from "next/link";
import { ArrowLeft, ArrowRight, Coffee, ShieldCheck, Wifi, Wrench, LayoutGrid, Droplets } from "lucide-react";

const benefits = [
  { icon: LayoutGrid, title: "Espacios variados", text: "Ambientes para trabajar, estudiar y desarrollar tus ideas." },
  { icon: Wrench, title: "Herramientas de trabajo", text: "Tableros y elementos útiles para tus jornadas." },
  { icon: Wifi, title: "Conectividad", text: "Wi-Fi para mantenerte conectado." },
  { icon: ShieldCheck, title: "Seguridad", text: "Control de ingreso en la entrada." },
  { icon: Coffee, title: "Hidratación", text: "Café y agua durante tu visita." },
  { icon: Droplets, title: "Comodidad", text: "Baños y un ambiente agradable." }
];

export default function CoworkingPage() {
  return (
    <main className="form-page coworking-page">
      <header className="simple-header">
        <Link href="/" className="wordmark">MUNDO <span>ALITAS</span></Link>
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Premios</Link>
      </header>
      <section className="coworking-hero">
        <div className="coworking-hero-copy">
          <p className="eyebrow">UN ESPACIO PARA TUS IDEAS</p>
          <h1>TRABAJA.<br /><em>CONECTA.</em><br />CREA.</h1>
          <p className="muted">Un lugar cómodo para avanzar en tus proyectos, compartir ideas y trabajar a tu ritmo.</p>
          <div className="coworking-facts"><span>MIÉRCOLES A DOMINGO</span><span>7:00 A. M. – 5:30 P. M.</span></div>
          <Link href="/coworking/registro" className="button button-gold coworking-cta">Tengo mi código para ingresar <ArrowRight size={17} /></Link>
          <p className="coworking-payment-note">El código de inscripción se entrega después de confirmar el pago directamente con el establecimiento.</p>
        </div>
        <div className="coworking-visual" aria-label="Espacio de coworking de Mundo Alitas">
          <div className="coworking-visual-mark">MA<span> / WORKSPACE</span></div>
          <div className="coworking-visual-caption"><strong>UN BUEN LUGAR PARA HACER QUE LAS COSAS PASEN.</strong><span>MUNDO ALITAS · COWORKING</span></div>
        </div>
      </section>
      <section className="coworking-benefits">
        <div className="coworking-section-heading"><p className="eyebrow">TU JORNADA INCLUYE</p><h2>TODO PARA<br /><em>ENFOCARTE.</em></h2></div>
        <div className="coworking-benefit-grid">
          {benefits.map(({ icon: Icon, title, text }, index) => <article className="coworking-benefit" key={title}><span className="coworking-benefit-number">0{index + 1}</span><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <footer className="coworking-footer"><span>MUNDO ALITAS · COWORKING</span><Link href="/coworking/admin">Administración</Link></footer>
    </main>
  );
}
