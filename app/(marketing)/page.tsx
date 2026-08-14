import Link from "next/link";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { RocketWordmark } from "@/components/ui/RocketWordmark";
import { PhoneCollage } from "@/components/marketing/PhoneCollage";

export default function LandingPage() {
  return (
    <div className="landing">
      <svg
        className="trail-svg"
        viewBox="0 0 420 480"
        aria-hidden="true"
      >
        <path
          d="M40 460 C 120 380, 90 260, 200 200 S 340 80, 380 20"
          stroke="#8C2846"
          strokeWidth="1.6"
          strokeDasharray="1 10"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <g transform="translate(365,10) rotate(35)">
          <use href="#rocket-svg" width="26" height="26" color="#6E1E33" />
        </g>
      </svg>

      <div className="landing-nav">
        <RocketWordmark />
        <div className="landing-nav-right">
          <Link href="/login">Entrar</Link>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-copy">
          <div className="landing-eyebrow">
            <RocketIcon size={12} />
            Sua rotina clínica, organizada
          </div>
          <h1>
            Você sabe exatamente <em>o quanto avançou</em> essa semana?
          </h1>
          <p className="lead">
            O Rocket organiza suas revisões, mostra onde focar e transforma cada
            hora de estudo em progresso visível, para você chegar mais confiante
            em cada prova e em cada plantão.
          </p>
          <div className="landing-cta-row">
            <Link href="/verify-code" className="btn btn-primary">
              Criar minha conta
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Já tenho conta
            </Link>
          </div>
          <span className="landing-note">sua evolução, dia após dia</span>
        </div>

        <PhoneCollage />
      </div>

      <div className="landing-footer">
        <span className="rc-badge">
          <RocketIcon size={11} />
          Exclusivo da Comunidade RC
        </span>
        <span className="sig">Por Raissa Alves</span>
      </div>
    </div>
  );
}
