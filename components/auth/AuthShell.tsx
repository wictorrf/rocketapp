import { RocketWordmark } from "@/components/ui/RocketWordmark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <RocketWordmark />
        <svg
          className="trail-svg"
          viewBox="0 0 420 480"
          style={{ top: "auto", bottom: "-60px", right: "-80px", opacity: 0.35 }}
          aria-hidden="true"
        >
          <path
            d="M20 20 C 100 100, 80 220, 190 280 S 330 400, 370 460"
            stroke="#F2A6C1"
            strokeWidth="1.6"
            strokeDasharray="1 10"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="auth-side-mid">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="auth-side-foot">UMA PLATAFORMA COMUNIDADE RC</div>
      </div>
      <div className="auth-panel">
        <div className="auth-box">{children}</div>
      </div>
    </div>
  );
}
