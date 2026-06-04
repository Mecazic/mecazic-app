# Mecazic

Plateforme web de gestion de l'association musique **Mecazic** de l'ISAE-Supmeca : réservation de la salle de répétition, organisation des groupes et planification des concerts.

## Fonctionnalités

### Calendrier de réservation
- Grille hebdomadaire (8h-23h) de la salle de musique
- Réservation d'un clic sur un créneau (30 min, 1h, 2h ou 4h), code couleur par groupe
- Détection des conflits de créneaux (vérification côté client **et** contrainte anti-chevauchement en base)
- Annulation par le créateur de la réservation ou un admin

### Groupes
- Création de groupe (nom, style musical, couleur) avec adhésion multi-groupes
- Page de groupe : membres, réservations à venir, répertoire musical
- Fiche par morceau : paroles récupérées automatiquement, liens YouTube, Songsterr et Ultimate Guitar

### Concerts
- Planification des événements (galas, afterworks, concerts)
- Programme des passages par groupe : horaire, durée, ordre de passage
- Setlist détaillée par passage : chansons, durées, répartition des rôles (« qui joue quoi »)
- Timeline visuelle et compteurs automatiques (groupes, chansons, minutes totales)

### Comptes et rôles
- Inscription par email avec confirmation
- **Membre** : réserver, gérer ses groupes, organiser des concerts
- **Admin** : supprimer n'importe quelle réservation, groupe ou concert

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16 (App Router) + React 19 |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Hébergement | Vercel |

Toutes les tables sont protégées par RLS : modification du rôle impossible via l'API (anti-escalade de privilèges), emails non exposés aux visiteurs anonymes, chevauchement de réservations bloqué par contrainte `tsrange` en base.

## Installation locale

```bash
git clone https://github.com/Mecazic/mecazic-app.git
cd mecazic-app
npm install
cp .env.example .env.local   # puis remplir avec les clés Supabase
npm run dev
```

L'app tourne sur [http://localhost:3000](http://localhost:3000).

## Setup Supabase (nouveau projet)

1. Créer un projet sur [supabase.com](https://supabase.com/dashboard) (région EU conseillée)
2. **SQL Editor** → coller le contenu de `supabase-schema.sql` → Run
3. **Project Settings → API Keys** : copier l'URL du projet et la clé `anon public` dans `.env.local` :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Créer son compte via l'app, puis se promouvoir admin dans le SQL Editor :
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'ton.email@exemple.fr';
   ```

## Déploiement (Vercel)

1. Connecter le repo GitHub à Vercel
2. Renseigner les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Dans Supabase : **Authentication → URL Configuration → Site URL** = l'URL Vercel de l'app (sinon les liens de confirmation par email pointent vers localhost)

> **Note free tier Supabase** : le projet se met en pause après ~1 semaine sans requête, et est supprimé après ~90 jours de pause. Le réveiller depuis le dashboard si besoin (typiquement à la rentrée).
