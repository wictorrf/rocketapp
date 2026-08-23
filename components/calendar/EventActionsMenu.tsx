"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KebabMenu, type KebabAction } from "@/components/ui/KebabMenu";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { QuestionResultForm } from "./QuestionResultForm";
import { duplicateCalendarEventAction, setEventStatusAction } from "@/lib/actions/calendar";
import { startReviewSessionAction } from "@/lib/actions/review";
import type { CalendarItem } from "@/lib/queries/calendar";

export function EventActionsMenu({
  event,
  onEdit,
  onViewDetails,
}: {
  event: CalendarItem;
  onEdit: () => void;
  onViewDetails?: () => void;
}) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [showQuestionResult, setShowQuestionResult] = useState(false);

  if (event.origin === "fsrs") {
    const fsrsActions: KebabAction[] = [
      ...(onViewDetails ? [{ label: "Ver detalhes", onClick: onViewDetails }] : []),
      { label: "Ver assunto", onClick: () => router.push(`/subjects/${event.subjectId}/topics/${event.topicId}`) },
      {
        label: "Começar revisão",
        // A página /review exige uma review_sessions criada antes (senão
        // redireciona de volta pro assunto) — precisa chamar a action, não
        // dá pra só navegar direto pra URL.
        onClick: () => {
          const formData = new FormData();
          formData.set("subjectId", event.subjectId ?? "");
          formData.set("topicId", event.topicId ?? "");
          startReviewSessionAction(formData);
        },
      },
    ];
    return <KebabMenu actions={fsrsActions} />;
  }

  const actions: KebabAction[] = [
    ...(onViewDetails ? [{ label: "Ver detalhes", onClick: onViewDetails }] : []),
    { label: "Editar", onClick: onEdit },
    {
      label: "Duplicar",
      onClick: async () => {
        await duplicateCalendarEventAction(event.id);
        router.refresh();
      },
    },
  ];

  if (event.status !== "cancelled") {
    actions.push({
      label: event.status === "done" ? "Marcar como pendente" : "Marcar como concluído",
      onClick: async () => {
        await setEventStatusAction(event.id, event.status === "done" ? "pending" : "done");
        router.refresh();
      },
    });
  }

  if (event.type === "questoes" && !event.questionLogId) {
    actions.push({ label: "Registrar resultado", onClick: () => setShowQuestionResult(true) });
  }

  if (event.status !== "cancelled") {
    actions.push({
      label: "Cancelar evento",
      onClick: async () => {
        await setEventStatusAction(event.id, "cancelled");
        router.refresh();
      },
    });
  } else {
    actions.push({
      label: "Reabrir evento",
      onClick: async () => {
        await setEventStatusAction(event.id, "pending");
        router.refresh();
      },
    });
  }

  actions.push({ label: "Excluir evento", danger: true, onClick: () => setShowDelete(true) });

  return (
    <>
      <KebabMenu actions={actions} />
      {showDelete && <DeleteEventDialog event={event} onClose={() => setShowDelete(false)} />}
      {showQuestionResult && <QuestionResultForm event={event} onClose={() => setShowQuestionResult(false)} />}
    </>
  );
}
