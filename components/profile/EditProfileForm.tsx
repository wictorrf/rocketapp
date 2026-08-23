"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateProfileAction, type ActionState } from "@/lib/actions/profile";
import { AREA_OPTIONS, type Area } from "@/lib/constants/title-map";
import type { GenderTreatment, ProfileForEdit } from "@/lib/queries/profile";

const initialState: ActionState = { error: null };

const GENDER_OPTIONS: { value: GenderTreatment; label: string }[] = [
  { value: "a", label: "Feminino (bem-vinda)" },
  { value: "o", label: "Masculino (bem-vindo)" },
  { value: "x", label: "Neutro" },
];

export function EditProfileForm({ profile }: { profile: ProfileForEdit }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [fullName, setFullName] = useState(profile.fullName);
  const [area, setArea] = useState<Area>(profile.area);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.photoUrl);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(profile.dailyGoalMinutes);
  const [genderTreatment, setGenderTreatment] = useState<GenderTreatment | "">(profile.genderTreatment ?? "");

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="card">
      <h2 className="section-title">Meu perfil</h2>

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
          <label>E-mail</label>
          <input type="email" value={profile.email} disabled />
        </div>

        <div className="field">
          <label htmlFor="fullName">Nome</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="area">Área de atuação</label>
          <select id="area" name="area" value={area} onChange={(e) => setArea(e.target.value as Area)}>
            {AREA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="genderTreatment">Como prefere ser chamada(o)?</label>
          <select
            id="genderTreatment"
            name="genderTreatment"
            value={genderTreatment}
            onChange={(e) => setGenderTreatment(e.target.value as GenderTreatment)}
          >
            <option value="">Prefiro não dizer</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="dailyGoalMinutes">Meta diária de estudo (minutos)</label>
          <input
            id="dailyGoalMinutes"
            name="dailyGoalMinutes"
            type="number"
            min={15}
            max={960}
            step={15}
            value={dailyGoalMinutes}
            onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
          />
        </div>

        {state.error && <p className="error-text">{state.error}</p>}
        <SubmitButton pendingText="Salvando...">Salvar alterações</SubmitButton>
      </form>
    </div>
  );
}
