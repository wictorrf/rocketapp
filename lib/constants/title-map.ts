export type Area =
  | "medicina"
  | "enfermagem"
  | "psicologia"
  | "odontologia"
  | "fisioterapia"
  | "outra";

export const AREA_OPTIONS: { value: Area; label: string }[] = [
  { value: "medicina", label: "Medicina" },
  { value: "enfermagem", label: "Enfermagem" },
  { value: "psicologia", label: "Psicologia" },
  { value: "odontologia", label: "Odontologia" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "outra", label: "Outra área da saúde" },
];

export const AREA_LABEL: Record<Area, string> = Object.fromEntries(
  AREA_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Area, string>;
