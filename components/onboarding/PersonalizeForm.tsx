"use client";

import { useActionState, useState } from "react";
import { RocketWordmark } from "@/components/ui/RocketWordmark";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { savePersonalizeAction, type ActionState } from "@/lib/actions/profile";
import { AREA_OPTIONS, type Area } from "@/lib/constants/title-map";

const initialState: ActionState = { error: null };

export function PersonalizeForm() {
  const [state, formAction] = useActionState(savePersonalizeAction, initialState);
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState<Area>("medicina");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const displayName = fullName.trim() || "Você";
  const areaLabel = AREA_OPTIONS.find((o) => o.value === area)?.label ?? "";

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="personalize-wrap">
      <div className="personalize-preview">
        <svg
          className="trail-svg"
          viewBox="0 0 420 480"
          style={{ opacity: 0.25 }}
          aria-hidden="true"
        >
          <path
            d="M40 460 C 120 380, 90 260, 200 200 S 340 80, 380 20"
            stroke="#F2A6C1"
            strokeWidth="1.6"
            strokeDasharray="1 10"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="preview-shell">
          <div className="preview-topbar">
            <RocketWordmark size={15} />
            <div className="preview-chip">
              <div className="pc-photo">
                {photoPreview ? <img src={photoPreview} alt="" /> : "👤"}
              </div>
              <div>
                <div className="pc-name">{displayName}</div>
                <div className="pc-role">{areaLabel}</div>
              </div>
            </div>
          </div>
          <div className="preview-hero">
            <span className="script">Bem-vinda,</span>
            <h4>{displayName}</h4>
            <p>Sua rotina de estudos começa agora</p>
          </div>
          <div className="preview-cards">
            <div className="pcard">
              <span>Horas</span>
              <b>0h</b>
            </div>
            <div className="pcard">
              <span>Sequência</span>
              <b>0 dias</b>
            </div>
          </div>
        </div>
      </div>

      <div className="personalize-form">
        <div className="pf-box">
          <div className="step">Passo 2 de 3</div>
          <h2>Personalize seu ambiente</h2>
          <p className="pf-lead">Assim a plataforma já te trata do jeito certo em cada tela.</p>

          <form action={formAction}>
            <div className="photo-upload">
              <label className="photo-circle" htmlFor="photo">
                {photoPreview ? <img src={photoPreview} alt="" /> : <span>📷</span>}
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
              <div className="photo-upload-text">
                <b>Sua foto</b>
                <span>Aparece em toda a plataforma</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor="fullName">Nome</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como podemos te chamar"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="area">Área de atuação</label>
              <select
                id="area"
                name="area"
                value={area}
                onChange={(e) => setArea(e.target.value as Area)}
              >
                {AREA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {state.error && <p className="error-text">{state.error}</p>}
            <SubmitButton pendingText="Salvando...">Continuar</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
