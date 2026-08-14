"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/lib/actions/profile";

const CONFIRM_WORD = "EXCLUIR";

export function DeleteAccountSection() {
  const [revealed, setRevealed] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="card" style={{ border: "1.5px solid var(--wine)", marginTop: 20 }}>
      <h2 className="section-title" style={{ color: "var(--wine)" }}>
        Excluir conta
      </h2>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
        Isso apaga permanentemente suas disciplinas, flashcards, histórico de revisões, sessões de
        foco e todos os outros dados da sua conta. Essa ação não pode ser desfeita.
      </p>

      {!revealed ? (
        <button
          className="btn btn-ghost"
          style={{ borderColor: "var(--wine)", color: "var(--wine)" }}
          onClick={() => setRevealed(true)}
        >
          Quero excluir minha conta
        </button>
      ) : (
        <div>
          <div className="field">
            <label htmlFor="confirmDelete">
              Digite <b>{CONFIRM_WORD}</b> para confirmar
            </label>
            <input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ background: "var(--wine)" }}
              disabled={confirmText !== CONFIRM_WORD || isPending}
              onClick={handleDelete}
            >
              {isPending ? "Excluindo..." : "Excluir permanentemente"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setRevealed(false);
                setConfirmText("");
                setError(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
