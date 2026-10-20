import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "supabase/functions/**"]),
  {
    rules: {
      // El proyecto migra un sitio estático: las <img> con object-fit del CSS
      // se conservan a propósito en lugar de next/image.
      "@next/next/no-img-element": "off",
      // Falsos positivos sobre fetch-on-mount (async) e hidratación desde
      // localStorage — patrones intencionales en esta migración.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
