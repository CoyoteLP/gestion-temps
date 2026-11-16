import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const chemin = (relatif: string) => fileURLToPath(new URL(relatif, import.meta.url))

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			// Même alias que `paths` dans tsconfig.json
			"@": chemin("./src"),
			// « server-only » lève une erreur hors du rendu serveur de Next.js : neutralisé pour les tests
			"server-only": chemin("./src/test/server-only.ts"),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		restoreMocks: true,
		unstubGlobals: true,
		unstubEnvs: true,
	},
})
