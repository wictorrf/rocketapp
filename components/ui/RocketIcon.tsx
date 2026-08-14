// Monta o <symbol> uma única vez no layout raiz; RocketIcon() referencia via <use>.
export function RocketIconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="rocket-svg" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2.5c2.8 1.6 4.5 4.9 4.5 8.6 0 2-.5 3.8-1.3 5.3l-3.2 2.6-3.2-2.6C7.9 14.9 7.4 13.1 7.4 11.1c0-3.7 1.7-7 4.6-8.6z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8.4 15.8l-2.1 1.2c-.5.3-.8.8-.8 1.4v1.6l2.4-1.1M15.6 15.8l2.1 1.2c.5.3.8.8.8 1.4v1.6l-2.4-1.1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.6 18.5s-.3 1.7.9 2.6c.1.1.3.1.5 0 1.2-.9.9-2.6.9-2.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </symbol>
    </svg>
  );
}

export function RocketIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg className={`rocket-icon ${className ?? ""}`} width={size} height={size}>
      <use href="#rocket-svg" />
    </svg>
  );
}
