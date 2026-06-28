-- Customisation des profils de groupe : photo + bannière
-- Ajoute les URLs d'images sur les groupes + un bucket de stockage public.

alter table public.groups
  add column if not exists avatar_url text,
  add column if not exists banner_url text;

-- Bucket public pour les images de groupe (photos de profil + bannières)
insert into storage.buckets (id, name, public)
values ('group-assets', 'group-assets', true)
on conflict (id) do nothing;

-- Lecture publique des objets du bucket
drop policy if exists "group-assets public read" on storage.objects;
create policy "group-assets public read"
  on storage.objects for select
  using (bucket_id = 'group-assets');

-- Écriture / remplacement / suppression réservés aux utilisateurs authentifiés
drop policy if exists "group-assets auth insert" on storage.objects;
create policy "group-assets auth insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'group-assets');

drop policy if exists "group-assets auth update" on storage.objects;
create policy "group-assets auth update"
  on storage.objects for update to authenticated
  using (bucket_id = 'group-assets');

drop policy if exists "group-assets auth delete" on storage.objects;
create policy "group-assets auth delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'group-assets');
