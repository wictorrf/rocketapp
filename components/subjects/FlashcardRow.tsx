import { STAGE_LABEL_PT, type StageLabel } from "@/lib/srs/sm2";
import { formatDueIn, isOverdue } from "@/lib/utils/format";

export function FlashcardRow({
  front,
  stage,
  dueAt,
  imageUrl,
}: {
  front: string;
  stage: StageLabel;
  dueAt: string;
  imageUrl: string | null;
}) {
  const overdue = stage !== "consolidado" && isOverdue(dueAt);
  return (
    <div className={`fc-row ${overdue ? "overdue" : ""}`}>
      <div className="fc-thumb">
        {imageUrl ? <img src={imageUrl} alt="" /> : "🗂️"}
      </div>
      <div className="fc-row-body">
        <b>{front}</b>
        <span>
          {overdue ? "Revisão atrasada" : `Próxima revisão ${formatDueIn(dueAt)}`}
        </span>
      </div>
      <div className={`fc-stage ${stage}`}>{STAGE_LABEL_PT[stage]}</div>
    </div>
  );
}
