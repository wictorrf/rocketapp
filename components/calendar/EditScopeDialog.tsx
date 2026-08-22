"use client";

export function EditScopeDialog({
  kind,
  onChoose,
  onCancel,
  pending,
  counts,
}: {
  kind: "edit" | "delete";
  onChoose: (scope: "this" | "future" | "all") => void;
  onCancel: () => void;
  pending?: boolean;
  counts?: { future: number; total: number } | null;
}) {
  const verb = kind === "edit" ? "Editar" : "Excluir";
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Esse evento faz parte de uma série</h2>
        <p className="confirm-dialog-body">Como você quer aplicar essa alteração?</p>
        <div className="confirm-dialog-actions" style={{ flexDirection: "column" }}>
          <button type="button" className="btn btn-ghost btn-block" disabled={pending} onClick={() => onChoose("this")}>
            {verb} somente este evento
          </button>
          <button type="button" className="btn btn-ghost btn-block" disabled={pending} onClick={() => onChoose("future")}>
            {verb} este e os próximos{counts ? ` (${counts.future})` : ""} eventos
          </button>
          <button
            type="button"
            className={kind === "delete" ? "btn btn-danger btn-block" : "btn btn-ghost btn-block"}
            disabled={pending}
            onClick={() => onChoose("all")}
          >
            {verb} todos os{counts ? ` ${counts.total}` : ""} eventos da série
          </button>
          <button type="button" className="btn btn-primary btn-block" disabled={pending} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
