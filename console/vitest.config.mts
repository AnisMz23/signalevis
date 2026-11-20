import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://exemple.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "cle-publique-test",
      NEXT_PUBLIC_API_URL: "https://exemple.supabase.co/functions/v1/v1",
    },
  },
});
