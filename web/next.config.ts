import type { NextConfig } from "next"

import { EN_TETES_FIXES } from "./src/lib/securite/en-tetes-fixes"

const nextConfig: NextConfig = {
	cacheComponents: true,
	partialPrefetching: true,
	poweredByHeader: false,
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
	// En-têtes de sécurité fixes, sur toutes les réponses (fichiers statiques compris) ; la CSP et
	// HSTS, qui dépendent de la requête ou de la configuration d'exécution, sont posés par le proxy
	async headers() {
		return [{ source: "/:chemin*", headers: [...EN_TETES_FIXES] }]
	},
	async redirects() {
		return [{ source: "/", destination: "/projets", permanent: false }]
	},
}

export default nextConfig
