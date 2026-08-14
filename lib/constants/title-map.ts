export type Area =
  | "medicina"
  | "enfermagem"
  | "psicologia"
  | "odontologia"
  | "fisioterapia"
  | "outra";

export type GenderTreatment = "a" | "o" | "x";

export const AREA_OPTIONS: { value: Area; label: string }[] = [
  { value: "medicina", label: "Medicina" },
  { value: "enfermagem", label: "Enfermagem" },
  { value: "psicologia", label: "Psicologia" },
  { value: "odontologia", label: "Odontologia" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "outra", label: "Outra área da saúde" },
];

export const GENDER_OPTIONS: { value: GenderTreatment; label: string }[] = [
  { value: "a", label: "Feminino" },
  { value: "o", label: "Masculino" },
  { value: "x", label: "Neutro" },
];

const TITLE_MAP: Record<Area, Record<GenderTreatment, string>> = {
  medicina: { a: "Dra.", o: "Dr.", x: "Dr(a)." },
  enfermagem: { a: "Enfermeira", o: "Enfermeiro", x: "Enfermeire" },
  psicologia: { a: "Psicóloga", o: "Psicólogo", x: "Psicólogue" },
  odontologia: { a: "Dra.", o: "Dr.", x: "Dr(a)." },
  fisioterapia: { a: "Fisioterapeuta", o: "Fisioterapeuta", x: "Fisioterapeuta" },
  outra: { a: "Estudante", o: "Estudante", x: "Estudante" },
};

export const AREA_LABEL: Record<Area, string> = Object.fromEntries(
  AREA_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Area, string>;

// Espelha updatePreview() do wireframe: "Dra. Raissa", "Enfermeiro João", etc.
export function computeDisplayTitle(fullName: string, area: Area, gender: GenderTreatment) {
  const firstName = fullName.trim().split(" ")[0] || "Você";
  return `${TITLE_MAP[area][gender]} ${firstName}`;
}
