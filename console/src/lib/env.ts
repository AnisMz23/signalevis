// Configuration publique de la console (KAN-63). Aucune valeur secrète : la clé publique Supabase
// (anon / publishable) est conçue pour être exposée au navigateur, la RLS protège les données.
const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
};

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  apiUrl: () => required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
};
