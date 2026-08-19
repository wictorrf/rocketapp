"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function SubjectSearchBar({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      router.push(`/subjects${params.toString() ? `?${params.toString()}` : ""}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, router]);

  return (
    <div className="subject-search">
      <span className="subject-search-icon">🔍</span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar disciplina..."
        aria-label="Buscar disciplina"
      />
    </div>
  );
}
