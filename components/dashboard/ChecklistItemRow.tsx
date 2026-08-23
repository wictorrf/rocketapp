"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveTaskColor, TASK_TYPE_LABEL } from "@/lib/constants/calendar";
import { EventActionsMenu } from "@/components/calendar/EventActionsMenu";
import { KebabMenu, type KebabAction } from "@/components/ui/KebabMenu";
import { toggleTaskStatusAction, setPlanActionStatusAction, deletePlanActionAction } from "@/lib/actions/calendar";
import { startReviewSessionAction } from "@/lib/actions/review";
import type { ChecklistItem } from "@/lib/queries/home";

export function ChecklistItemRow({ item, onEdit }: { item: ChecklistItem; onEdit: (item: ChecklistItem) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState(item.status === "done");

  // O mesmo item pode aparecer em mais de um card ao mesmo tempo (Checklist
  // de hoje e Checklist da semana), e o status também pode mudar pelo menu
  // de ações (EventActionsMenu), não só por este checkbox — sem isso, essas
  // outras vias de mudança deixariam este checkbox com um estado otimista
  // desatualizado depois do router.refresh(). Ajusta durante a renderização
  // (padrão recomendado pelo React) em vez de usar um efeito.
  const [prevStatus, setPrevStatus] = useState(item.status);
  if (item.status !== prevStatus) {
    setPrevStatus(item.status);
    setOptimisticDone(item.status === "done");
  }

  const color = resolveTaskColor(item);
  const typeLabel = item.typeCustom || TASK_TYPE_LABEL[item.type] || item.type;
  const isFsrs = item.kind === "fsrs";
  const isCancelled = item.status === "cancelled";

  function toggle() {
    const next = !optimisticDone;
    setOptimisticDone(next);
    startTransition(async () => {
      if (item.kind === "plan_action" && item.planActionId) {
        await setPlanActionStatusAction(item.planActionId, next ? "done" : "pending");
      } else {
        await toggleTaskStatusAction(item.id, next);
      }
      router.refresh();
    });
  }

  function handleTitleClick() {
    if (item.kind === "calendar_task") onEdit(item);
  }

  const planActions: KebabAction[] = [
    { label: "Ver planejamento", onClick: () => router.push(`/calendar?year=${item.scheduledDate.slice(0, 4)}&month=${Number(item.scheduledDate.slice(5, 7))}&plan=1`) },
    {
      label: optimisticDone ? "Marcar como pendente" : "Marcar como concluído",
      onClick: toggle,
    },
    {
      label: "Arquivar",
      onClick: () => {
        startTransition(async () => {
          if (item.planActionId) await setPlanActionStatusAction(item.planActionId, "archived");
          router.refresh();
        });
      },
    },
    {
      label: "Excluir",
      danger: true,
      onClick: () => {
        startTransition(async () => {
          if (item.planActionId) await deletePlanActionAction(item.planActionId, false);
          router.refresh();
        });
      },
    },
  ];

  const rowClassName = `checklist-row${isCancelled ? " cancelled" : ""}${optimisticDone ? " done" : ""}`;

  const rowContent = (
    <>
      {item.checkable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={optimisticDone}
          aria-label={optimisticDone ? "Marcar como pendente" : "Marcar como concluída"}
          className={`checklist-check${optimisticDone ? " checked" : ""}`}
          style={optimisticDone ? { background: color, borderColor: color } : { borderColor: color }}
          onClick={toggle}
          disabled={isPending || isCancelled}
        >
          {optimisticDone && "✓"}
        </button>
      ) : (
        <span className="checklist-dot" style={{ background: color }} />
      )}

      <button type={isFsrs ? "submit" : "button"} className="checklist-body" onClick={isFsrs ? undefined : handleTitleClick}>
        <b style={optimisticDone ? { textDecoration: "line-through" } : undefined}>
          {item.emoji ? `${item.emoji} ` : ""}
          {isFsrs ? `Revisar ${item.cardCount} ${item.cardCount === 1 ? "flashcard" : "flashcards"} de ${item.title}` : item.title}
        </b>
        <div className="checklist-meta">
          {isFsrs ? (
            <span>Revisão</span>
          ) : (
            <span>{typeLabel}</span>
          )}
          {item.subjectName && <span>{item.subjectName}</span>}
          {item.topicName && !isFsrs && <span>{item.topicName}</span>}
          {!item.allDay && item.startTime && (
            <span>
              🕐 {item.startTime.slice(0, 5)}
              {item.endTime ? `–${item.endTime.slice(0, 5)}` : ""}
            </span>
          )}
          {isCancelled && <span>Cancelada</span>}
          {isFsrs && item.reviewedTodayCount !== null && item.reviewedTodayCount > 0 && (
            <span>
              {item.reviewedTodayCount} de {(item.cardCount ?? 0) + item.reviewedTodayCount} revisados
            </span>
          )}
        </div>
      </button>

      {isFsrs ? (
        <button type="submit" className="btn btn-primary btn-sm">
          Começar agora
        </button>
      ) : item.kind === "calendar_task" ? (
        <EventActionsMenu event={item} onEdit={() => onEdit(item)} />
      ) : (
        <KebabMenu actions={planActions} />
      )}
    </>
  );

  // Revisão FSRS: a página /review exige uma review_sessions criada antes
  // (senão redireciona de volta pro assunto) — igual ao "Iniciar revisão de
  // hoje" da página do assunto, precisa de um <form> de verdade chamando a
  // action, não dá pra só navegar direto pra URL.
  if (isFsrs) {
    return (
      <form action={startReviewSessionAction} className={rowClassName}>
        <input type="hidden" name="subjectId" value={item.subjectId ?? ""} />
        <input type="hidden" name="topicId" value={item.topicId ?? ""} />
        {rowContent}
      </form>
    );
  }

  return <div className={rowClassName}>{rowContent}</div>;
}
