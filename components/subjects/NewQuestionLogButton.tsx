"use client";

import { useState } from "react";
import { QuestionLogFormPanel } from "./QuestionLogFormPanel";

export function NewQuestionLogButton({ subjectId, topicId }: { subjectId: string; topicId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Registrar questões
      </button>
      <QuestionLogFormPanel mode="create" subjectId={subjectId} topicId={topicId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
