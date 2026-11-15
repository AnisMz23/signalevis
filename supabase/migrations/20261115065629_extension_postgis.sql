-- KAN-42 CA1 : PostGIS, installé dans le schéma "extensions" (recommandation Supabase,
-- évite d'exposer les fonctions PostGIS via l'API du schéma public).
create extension if not exists postgis with schema extensions;
