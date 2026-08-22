"use client";

import { useState } from "react";
import { SubjectFormPanel } from "./SubjectFormPanel";

export function NewSubjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + Nova disciplina
      </button>
      <SubjectFormPanel mode="create" open={open} onClose={() => setOpen(false)} />
    </>
  );
}
