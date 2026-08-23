-- Rocket — Flashcards: texto alternativo das imagens (documento de
-- requisitos de Flashcards, seção 9 — acessibilidade das imagens da frente
-- e do verso).

alter table public.flashcards
  add column image_alt text,
  add column back_image_alt text;
