import { RocketIcon } from "@/components/ui/RocketIcon";

// Colagem de telefones da hero da Landing — ilustrativa, com dados de exemplo
// (não reflete dados reais de nenhuma usuária), igual ao wireframe original.
const MINI_TASKS: Record<number, "green" | "pink" | "wine"> = {
  2: "green",
  4: "pink",
  6: "wine",
  9: "green",
  11: "pink",
  13: "green",
  17: "wine",
  20: "green",
  23: "pink",
  26: "green",
};
const COLOR_VAR: Record<string, string> = {
  green: "var(--green)",
  wine: "var(--wine)",
  pink: "var(--pink)",
};
const MINI_START = 5; // offset do primeiro dia do mês de exemplo
const MINI_TODAY = 8;

function MiniCalendarGrid() {
  const cells = [];
  for (let i = 0; i < MINI_START; i++) {
    cells.push(<div key={`pad-${i}`} className="pc-cell" style={{ background: "transparent" }} />);
  }
  for (let d = 1; d <= 28; d++) {
    const dot = MINI_TASKS[d];
    cells.push(
      <div key={d} className={`pc-cell${d === MINI_TODAY ? " today" : ""}`}>
        {dot && <i style={{ background: COLOR_VAR[dot] }} />}
      </div>,
    );
  }
  return <div className="pc-grid">{cells}</div>;
}

export function PhoneCollage() {
  return (
    <div className="phone-collage">
      <div className="blob b1" />
      <div className="blob b2" />

      <div className="phone phone-focus">
        <div className="pscreen">
          <div className="pstatus">
            <span>9:30</span>
            <span>●</span>
          </div>
          <div className="pf-mini-label">Tempo de foco</div>
          <div className="pf-mini-ring">
            <span>25:00</span>
          </div>
          <div className="pf-mini-play">▶</div>
        </div>
      </div>

      <div className="phone phone-home">
        <div className="pscreen">
          <div className="pstatus" style={{ color: "var(--text-muted)" }}>
            <span>9:30</span>
            <span>●</span>
          </div>
          <div className="ph-mini-hero">
            <span className="sc">Bem-vinda,</span>
            <b>Dra. Raissa</b>
          </div>
          <div className="ph-mini-streak">
            <span>Constância</span>
            <b>🔥 4 dias</b>
          </div>
          <div className="ph-mini-stats">
            <div>
              <span>Horas</span>
              <b>38h</b>
            </div>
            <div>
              <span>Acertos</span>
              <b>78%</b>
            </div>
          </div>
        </div>
      </div>

      <div className="phone phone-calendar">
        <div className="pscreen">
          <div className="pstatus">
            <span>9:30</span>
            <span>●</span>
          </div>
          <div className="pc-topbar">
            <b>Calendário</b>
            <div className="pc-dot-nav" />
          </div>
          <div className="pc-month-row">
            <b>Este mês</b>
          </div>
          <div className="pc-legend">
            <span>
              <i style={{ background: "var(--green)" }} />
              Revisão
            </span>
            <span>
              <i style={{ background: "var(--wine)" }} />
              Prova
            </span>
            <span>
              <i style={{ background: "var(--pink)" }} />
              1º contato
            </span>
          </div>
          <MiniCalendarGrid />
          <div className="pc-ritual">
            <div className="ic">
              <RocketIcon size={10} />
            </div>
            <div>
              <b>Planejar o mês</b>
              <span>Ritual mensal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
