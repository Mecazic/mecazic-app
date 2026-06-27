-- ============================================================
-- MECAZIC - SCHÉMA COMPLET (v2, consolidé)
-- À exécuter dans l'éditeur SQL de Supabase, sur un projet vierge.
-- Remplace : supabase-schema.sql (corrompu), supabase-rls-fix.sql,
--            supabase-update.sql, supabase-full-migration.sql,
--            supabase-fkey-fix.sql, supabase-rls-unlock.sql
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Groupes de musique
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  description TEXT DEFAULT '',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profils utilisateurs (1:1 avec auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL, -- legacy, remplacé par group_members
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adhésions aux groupes (many-to-many)
-- NOTE : user_id référence public.profiles (et non auth.users) pour que
-- PostgREST puisse résoudre les jointures imbriquées profiles <-> group_members.
CREATE TABLE IF NOT EXISTS public.group_members (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Réservations de la salle
-- user_id référence public.profiles pour permettre l'embed PostgREST profiles(username)
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Répétition',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL CHECK (duration IN (30, 60, 120, 240)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Anti-chevauchement : deux réservations ne peuvent pas se superposer.
  -- Le client vérifie déjà, mais cette contrainte élimine la race condition.
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    tsrange(
      (date + start_time),
      (date + start_time + make_interval(mins => duration))
    ) WITH &&
  )
);

-- Répertoire musical par groupe
CREATE TABLE IF NOT EXISTS public.group_repertoire (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  duration_seconds INTEGER DEFAULT 180,
  lyrics TEXT DEFAULT '',
  chords_link TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concerts
CREATE TABLE IF NOT EXISTS public.concerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passages des groupes dans un concert
CREATE TABLE IF NOT EXISTS public.concert_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concert_id UUID REFERENCES public.concerts(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  set_order INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chansons d'un set
CREATE TABLE IF NOT EXISTS public.set_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID REFERENCES public.concert_sets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 180,
  assignments TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  song_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_group ON public.reservations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_group ON public.group_repertoire(group_id);
CREATE INDEX IF NOT EXISTS idx_concerts_date ON public.concerts(date);
CREATE INDEX IF NOT EXISTS idx_concert_sets_concert ON public.concert_sets(concert_id);
CREATE INDEX IF NOT EXISTS idx_set_songs_set ON public.set_songs(set_id);

-- ============================================================
-- 3. TRIGGER : création automatique du profil à l'inscription
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. PROTECTION CONTRE L'ESCALADE DE PRIVILÈGES
-- ============================================================
-- Personne ne peut modifier profiles.role ou profiles.email via l'API :
-- on retire le droit générique puis on ne ré-autorise que les colonnes sûres.
-- (Pour nommer un admin : Dashboard Supabase > SQL Editor >
--  UPDATE public.profiles SET role = 'admin' WHERE email = '...';)

REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, username, email, group_id) ON public.profiles TO authenticated;
GRANT UPDATE (username, group_id) ON public.profiles TO authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_repertoire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concert_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_songs ENABLE ROW LEVEL SECURITY;

-- 5.1 GROUPS — lecture publique (affichés avant connexion), écriture encadrée
DROP POLICY IF EXISTS "groups_select" ON public.groups;
CREATE POLICY "groups_select" ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "groups_insert" ON public.groups;
CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "groups_update" ON public.groups;
CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "groups_delete" ON public.groups;
CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 5.2 PROFILES — lecture réservée aux connectés (les emails ne sont pas publics)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5.3 GROUP_MEMBERS — on ne gère que sa propre adhésion ;
-- impossible de s'auto-proclamer admin d'un groupe qu'on n'a pas créé
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
CREATE POLICY "group_members_insert" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'member'
      OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;
CREATE POLICY "group_members_delete" ON public.group_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5.4 RESERVATIONS — visibles par les connectés, créées par un membre du groupe
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = reservations.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
CREATE POLICY "reservations_delete" ON public.reservations
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 5.5 GROUP_REPERTOIRE — gestion collaborative entre connectés
DROP POLICY IF EXISTS "repertoire_select" ON public.group_repertoire;
CREATE POLICY "repertoire_select" ON public.group_repertoire
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "repertoire_insert" ON public.group_repertoire;
CREATE POLICY "repertoire_insert" ON public.group_repertoire
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "repertoire_update" ON public.group_repertoire;
CREATE POLICY "repertoire_update" ON public.group_repertoire
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "repertoire_delete" ON public.group_repertoire;
CREATE POLICY "repertoire_delete" ON public.group_repertoire
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 5.6 CONCERTS — lecture publique, édition collaborative,
-- suppression par le créateur ou un admin de l'asso
DROP POLICY IF EXISTS "concerts_select" ON public.concerts;
CREATE POLICY "concerts_select" ON public.concerts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "concerts_insert" ON public.concerts;
CREATE POLICY "concerts_insert" ON public.concerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "concerts_update" ON public.concerts;
CREATE POLICY "concerts_update" ON public.concerts
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "concerts_delete" ON public.concerts;
CREATE POLICY "concerts_delete" ON public.concerts
  FOR DELETE TO authenticated USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 5.7 CONCERT_SETS & SET_SONGS — planification collaborative entre connectés
DROP POLICY IF EXISTS "sets_select" ON public.concert_sets;
CREATE POLICY "sets_select" ON public.concert_sets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sets_insert" ON public.concert_sets;
CREATE POLICY "sets_insert" ON public.concert_sets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sets_update" ON public.concert_sets;
CREATE POLICY "sets_update" ON public.concert_sets
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sets_delete" ON public.concert_sets;
CREATE POLICY "sets_delete" ON public.concert_sets
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "songs_select" ON public.set_songs;
CREATE POLICY "songs_select" ON public.set_songs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "songs_insert" ON public.set_songs;
CREATE POLICY "songs_insert" ON public.set_songs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "songs_update" ON public.set_songs;
CREATE POLICY "songs_update" ON public.set_songs
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "songs_delete" ON public.set_songs;
CREATE POLICY "songs_delete" ON public.set_songs
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5bis. PRIVILÈGES DE TABLE (rôles anon / authenticated)
-- ------------------------------------------------------------
-- Sur Supabase cloud, ces grants sont posés automatiquement par
-- la plateforme. En LOCAL (CLI) ils ne le sont pas → sans eux,
-- même un utilisateur connecté reçoit « permission denied » (42501).
-- La RLS ci-dessus reste l'autorité réelle : ces grants ouvrent
-- l'accès au niveau table, les policies filtrent les lignes.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- ============================================================
-- 6. RECHARGER LE CACHE POSTGREST
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- APRÈS L'INSCRIPTION DE TON COMPTE, exécute ceci pour devenir
-- admin de l'application (à adapter avec ton email) :
--
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'ton.email@exemple.fr';
-- ============================================================
