-- ============================================
-- MECAZIC - Schéma de base de données Supabase
-- ============================================
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des groupes de musique
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des profils utilisateurs (liée à auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réservations
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Répétition',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL CHECK (duration IN (30, 60, 120, 240)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches de réservations par date
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_group ON reservations(group_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policies pour groups : tout le monde peut lire
CREATE POLICY "Tout le monde peut voir les groupes" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Les admins peuvent créer des groupes" ON groups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Les admins peuvent modifier les groupes" ON groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Policies pour profiles
CREATE POLICY "Tout le monde peut voir les profils" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies pour reservations
CREATE POLICY "Tout le monde peut voir les réservations" ON reservations
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs connectés peuvent créer des réservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les créateurs peuvent supprimer leurs réservations" ON reservations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Les admins peuvent supprimer toute réservation" ON reservations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================
-- Données initiales : 5 groupes
-- ============================================

INSERT INTO groups (name, color, description) VALUES
  ('Les Amplifiés', '#8B5CF6', 'Rock & Metal'),
  ('Jazz Fusion', '#F59E0B', 'Jazz & Fusion'),
  ('Acoustica', '#10B981', 'Acoustique & Folk'),
  ('Beat Machine', '#EF4444', 'Hip-Hop & Beatmaking'),
  ('Les Électrons', '#3B82F6', 'Électro & Synthwave');

-- ============================================
-- Trigger pour créer un profil automatiquement
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONCERTS - Organisation de concerts
-- ============================================

-- Table des concerts
CREATE TABLE concerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des passages de groupes dans un concert (sets)
CREATE TABLE concert_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concert_id UUID REFERENCES concerts(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  set_order INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des chansons dans un set
CREATE TABLE set_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID REFERENCES concert_sets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 180,
  assignments TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  song_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_concerts_date ON concerts(date);
CREATE INDEX idx_concert_sets_concert ON concert_sets(concert_id);
CREATE INDEX idx_set_songs_set ON set_songs(set_id);

-- RLS pour concerts
ALTER TABLE concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_songs ENABLE ROW LEVEL SECURITY;

-- Concerts : tout le monde peut voir
CREATE POLICY "Tout le monde peut voir les concerts" ON concerts
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs connectés peuvent créer des concerts" ON concerts
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Les créateurs et admins peuvent modifier les concerts" ON concerts
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Les créateurs et admins peuvent supprimer les concerts" ON concerts
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Concert sets : tout le monde peut voir
CREATE POLICY "Tout le monde peut voir les sets" ON concert_sets
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs connectés peuvent créer des sets" ON concert_sets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs connectés peuvent modifier les sets" ON concert_sets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs connectés peuvent supprimer les sets" ON concert_sets
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Set songs : tout le monde peut voir
CREATE POLICY "Tout le monde peut voir les chansons" ON set_songs
  FOR SELECT USING (true);

CREATE POLICY "Les utilisateurs connectés peuvent créer des chansons" ON set_songs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs connectés peuvent modifier les chansons" ON set_songs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Les utilisateurs connectés peuvent supprimer les chansons" ON set_songs
  FOR DELETE USING (auth.uid() IS NOT NULL);
