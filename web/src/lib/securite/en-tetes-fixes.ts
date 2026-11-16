// Module sans dépendance : il est aussi importé par next.config.ts, compilé à part (sans l'alias `@/`)

/**
 * En-têtes de sécurité identiques pour toutes les réponses, statiques comprises
 * (`next.config.ts`). La CSP et HSTS, qui dépendent de la requête ou de la configuration
 * d'exécution, sont posés par le proxy.
 */
export const EN_TETES_FIXES: readonly Readonly<{ key: string; value: string }>[] = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	// Anciens navigateurs : les autres appliquent `frame-ancestors 'none'` de la CSP
	{ key: "X-Frame-Options", value: "DENY" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	},
	{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]
