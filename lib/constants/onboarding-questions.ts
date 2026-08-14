// Portado de gkQuestions no wireframe. Cada pergunta grava a `key` da opção
// escolhida (não o texto) numa coluna de onboarding_responses.

export type OnboardingOption = { key: string; icon: string; title: string; subtitle: string };
export type OnboardingQuestion = {
  column: "course_phase" | "biggest_challenge" | "goal_exam" | "weekly_hours_bracket" | "study_style";
  question: string;
  options: OnboardingOption[];
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    column: "course_phase",
    question: "Vamos te conhecer. Em que fase do curso você está?",
    options: [
      { key: "ciclo_basico", icon: "📘", title: "Ciclo básico", subtitle: "Ainda nas disciplinas iniciais" },
      { key: "ciclo_clinico", icon: "🩺", title: "Ciclo clínico", subtitle: "Já em contato com casos reais" },
      { key: "internato", icon: "🏥", title: "Internato", subtitle: "Vivendo a rotina do hospital" },
      { key: "formada_revisando", icon: "🎓", title: "Já formada, revisando para prova", subtitle: "Residência ou concurso" },
    ],
  },
  {
    column: "biggest_challenge",
    question: "Qual é o seu maior desafio ao estudar hoje?",
    options: [
      { key: "organizar_tempo", icon: "⏱️", title: "Organizar o tempo", subtitle: "Sobra pouco tempo no dia" },
      { key: "raciocinio_casos", icon: "🧩", title: "Entender a lógica dos casos", subtitle: "Raciocínio clínico na prática" },
      { key: "manter_constancia", icon: "🔁", title: "Manter a constância", subtitle: "Começar bem e não sustentar" },
      { key: "memorizar_conteudo", icon: "🧠", title: "Memorizar o conteúdo", subtitle: "Fica difícil reter depois de um tempo" },
    ],
  },
  {
    column: "goal_exam",
    question: "Você tem uma prova ou objetivo definido?",
    options: [
      { key: "residencia", icon: "🎯", title: "Sim, residência médica", subtitle: "Já tenho uma data em mente" },
      { key: "prova_faculdade", icon: "📝", title: "Sim, prova da faculdade", subtitle: "Avaliação de módulo ou estágio" },
      { key: "rotina_diaria", icon: "🌱", title: "Ainda não, quero rotina diária", subtitle: "Foco em consistência por enquanto" },
    ],
  },
  {
    column: "weekly_hours_bracket",
    question: "Quantas horas por semana você consegue dedicar aos estudos?",
    options: [
      { key: "ate_5h", icon: "🕐", title: "Até 5 horas", subtitle: "Rotina apertada" },
      { key: "5_a_10h", icon: "🕓", title: "De 5 a 10 horas", subtitle: "Consigo intercalar bem" },
      { key: "10_a_20h", icon: "🕗", title: "De 10 a 20 horas", subtitle: "Boa parte da semana dedicada" },
      { key: "mais_20h", icon: "🕛", title: "Mais de 20 horas", subtitle: "Estudo é prioridade central agora" },
    ],
  },
  {
    column: "study_style",
    question: "Como você prefere estudar na maior parte do tempo?",
    options: [
      { key: "sozinha", icon: "🙋‍♀️", title: "Sozinha", subtitle: "No meu próprio ritmo" },
      { key: "em_grupo", icon: "👥", title: "Em grupo", subtitle: "Discutindo casos com colegas" },
      { key: "alternando", icon: "🔀", title: "Alternando entre os dois", subtitle: "Depende do assunto e da semana" },
    ],
  },
];
