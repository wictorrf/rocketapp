"use client";

import { useMemo, useState } from "react";
import { FlashcardRow } from "./FlashcardRow";
import { getSignedImageUrlsAction } from "@/lib/actions/flashcards";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";
import type { FlashcardWithState } from "@/lib/queries/topics";

type DueBucket = "todas" | "atrasados" | "hoje" | "semana" | "mais_tarde" | "suspensos";

const DUE_BUCKET_OPTIONS: { value: DueBucket; label: string }[] = [
  { value: "todas", label: "Próxima revisão: todas" },
  { value: "atrasados", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mais_tarde", label: "Mais adiante" },
  { value: "suspensos", label: "Suspensos" },
];

const PAGE_SIZE = 20;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function dueBucketOf(card: FlashcardWithState, startOfToday: Date, endOfWeek: Date): DueBucket {
  if (card.suspended) return "suspensos";
  const dueAt = new Date(card.dueAt);
  if (dueAt < startOfToday) return "atrasados";
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  if (dueAt <= endOfToday) return "hoje";
  if (dueAt <= endOfWeek) return "semana";
  return "mais_tarde";
}

// Seção colapsável com busca, filtro por etiqueta/próxima revisão e
// carregamento progressivo. Quando `lazySign` é passado, as imagens só são
// assinadas na primeira vez que a seção é aberta — evita assinar imagens de
// cartões que a pessoa nunca chega a ver (ex: "Todos os flashcards", que
// começa fechado).
export function FlashcardSection({
  title,
  defaultOpen = true,
  emptyMessage,
  cards,
  subjectId,
  topicId,
  lazySign = false,
}: {
  title: string;
  defaultOpen?: boolean;
  emptyMessage: string;
  cards: FlashcardWithState[];
  subjectId: string;
  topicId: string;
  lazySign?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dueFilter, setDueFilter] = useState<DueBucket>("todas");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [imagesLoaded, setImagesLoaded] = useState(!lazySign);
  const [imagesLoading, setImagesLoading] = useState(false);

  const allTags = useMemo(() => Array.from(new Set(cards.flatMap((c) => c.tags))).sort(), [cards]);

  const { startOfToday, endOfWeek } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { startOfToday: start, endOfWeek: end };
  }, []);

  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    return cards.filter((c) => {
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (dueFilter !== "todas" && dueBucketOf(c, startOfToday, endOfWeek) !== dueFilter) return false;
      if (!needle) return true;
      const haystack = normalize(`${htmlToPlainText(c.front)} ${htmlToPlainText(c.back)} ${c.tags.join(" ")}`);
      return haystack.includes(needle);
    });
  }, [cards, search, tagFilter, dueFilter, startOfToday, endOfWeek]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  async function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!lazySign || !e.currentTarget.open || imagesLoaded || imagesLoading) return;
    setImagesLoading(true);
    const paths = cards.flatMap((c) => [c.imageUrl, c.backImageUrl]).filter((p): p is string => Boolean(p));
    const urls = paths.length ? await getSignedImageUrlsAction(paths) : {};
    setSignedUrls(urls);
    setImagesLoaded(true);
    setImagesLoading(false);
  }

  function resolveImages(card: FlashcardWithState): FlashcardWithState {
    if (!lazySign) return card;
    if (!imagesLoaded) return { ...card, imageUrl: null, backImageUrl: null };
    return {
      ...card,
      imageUrl: card.imageUrl ? (signedUrls[card.imageUrl] ?? null) : null,
      backImageUrl: card.backImageUrl ? (signedUrls[card.backImageUrl] ?? null) : null,
    };
  }

  return (
    <details className="collapsible-section" open={defaultOpen} onToggle={handleToggle}>
      <summary>
        <h2 className="section-title">{title}</h2>
      </summary>
      <div className="collapsible-body">
        {cards.length > 0 && (
          <div className="subject-filters">
            <div className="subject-search">
              <span className="subject-search-icon">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Buscar flashcard..."
                aria-label={`Buscar em ${title}`}
              />
              {search && (
                <button type="button" className="subject-search-clear" onClick={() => setSearch("")} aria-label="Limpar busca">
                  ✕
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <select
                aria-label="Filtrar por etiqueta"
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <option value="">Todas as etiquetas</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Filtrar por próxima revisão"
              value={dueFilter}
              onChange={(e) => {
                setDueFilter(e.target.value as DueBucket);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              {DUE_BUCKET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="fc-list">
          {cards.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              {emptyMessage}
            </div>
          )}
          {cards.length > 0 && filtered.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Nenhum flashcard encontrado com esses filtros.
            </div>
          )}
          {visible.map((f) => (
            <FlashcardRow key={f.id} subjectId={subjectId} topicId={topicId} card={resolveImages(f)} />
          ))}
        </div>

        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              Carregar mais ({filtered.length - visible.length} restantes)
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
