"use client";

import { useRouter } from "next/navigation";
import { FlashcardForm } from "./FlashcardForm";
import type { FlashcardForEdit } from "@/lib/queries/flashcards";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

// Hospeda o FlashcardForm como página própria (link direto/compartilhável,
// ex: "Ver cartão existente" do aviso de duplicidade) — fechar navega de
// volta pro assunto, em vez de só esconder um painel local.
export function FlashcardFormStandalone({
  backHref,
  subjects,
  defaultSubjectId,
  defaultTopicId,
  flashcard,
}: {
  backHref: string;
  subjects: SubjectWithTopicsOption[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
  flashcard?: FlashcardForEdit;
}) {
  const router = useRouter();
  return (
    <FlashcardForm
      open
      onClose={() => router.push(backHref)}
      subjects={subjects}
      defaultSubjectId={defaultSubjectId}
      defaultTopicId={defaultTopicId}
      flashcard={flashcard}
    />
  );
}
