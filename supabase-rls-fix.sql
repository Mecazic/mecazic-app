-- ============================================
-- CORRECTIFS RLS - À exécuter dans le SQL Editor de Supabase
-- ============================================

-- 1. S'assurer que les utilisateurs peuvent mettre à jour leur propre profil
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. S'assurer que la politique de suppression des réservations existe pour les admins
DROP POLICY IF EXISTS "Les admins peuvent supprimer les réservations" ON public.reservations;
CREATE POLICY "Les admins peuvent supprimer les réservations" ON public.reservations
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- 3. Politique de suppression du répertoire pour les utilisateurs connectés
DROP POLICY IF EXISTS "Les admins peuvent supprimer du répertoire" ON public.group_repertoire;
CREATE POLICY "Les admins peuvent supprimer du répertoire" ON public.group_repertoire
  FOR DELETE USING (
    auth.uid() IS NOT NULL
  );
