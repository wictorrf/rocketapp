"use client";

import { useState } from "react";
import { TopicFormPanel } from "./TopicFormPanel";

export function NewTopicButton({ subjectId }: { subjectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Novo assunto
      </button>
      <TopicFormPanel mode="create" subjectId={subjectId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
