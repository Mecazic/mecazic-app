-- Donnees de demo (dev local uniquement). Executees en superuser -> RLS bypassee.
-- Permet d'avoir des ecrans peuples des le premier lancement.

insert into public.groups (name, color, description) values
  ('Klaxon',       '#FFAA2B', 'Funk / groove'),
  ('The Amps',     '#4A9DD6', 'Rock'),
  ('Velours',      '#C77DFF', 'Pop / chanson'),
  ('Nuit Blanche', '#5BB98C', 'Indie')
on conflict (name) do nothing;

insert into public.concerts (name, date, location, description) values
  ('Gala de printemps', '2026-07-12', 'Amphi A', 'Le grand gala annuel de Mecazic'),
  ('Afterwork BDE',     '2026-07-03', 'Foyer',   'Set acoustique entre deux verres')
on conflict do nothing;
