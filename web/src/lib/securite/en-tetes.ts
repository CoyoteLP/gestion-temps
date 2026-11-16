import { DUREE_HSTS_SECONDES } from "@/lib/constantes"

/** En-tête qui transmet au rendu le nonce de la requête (lu par le layout racine). */
export const EN_TETE_NONCE = "x-nonce"

/**
 * @returns un nonce aléatoire (128 bits, base64), propre à une requête
 */
export function genererNonce(): string {
	const octets = new Uint8Array(16)
	crypto.getRandomValues(octets)
	return Buffer.from(octets).toString("base64")
}

/** Ce dont dépend la politique de sécurité du contenu d'une requête. */
export type ContexteCsp = Readonly<{
	nonce: string
	/** Serveur de développement : React a besoin de `eval` pour ses messages d'erreur. */
	developpement: boolean
	/** Application servie en HTTPS : les ressources en HTTP sont converties. */
	https: boolean
	/** Émetteur OIDC (`OIDC_ISSUER_URI`), destination autorisée des formulaires de connexion. */
	emetteurOidc?: string
}>

/**
 * Politique de sécurité du contenu d'une page. Les scripts ne s'exécutent que s'ils portent le
 * nonce de la requête (`'strict-dynamic'` étend la confiance aux scripts qu'ils chargent) ; les
 * styles en ligne restent permis (attributs `style` des composants). Le site ne peut pas être
 * affiché dans un cadre, et les formulaires ne partent que vers l'application ou le fournisseur
 * OIDC (connexion sans JavaScript).
 *
 * @param contexte nonce et environnement de la requête
 * @returns la valeur de l'en-tête `Content-Security-Policy`
 */
export function politiqueContenu({ nonce, developpement, https, emetteurOidc }: ContexteCsp): string {
	const fournisseur = origine(emetteurOidc)
	const directives = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developpement ? " 'unsafe-eval'" : ""}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' blob: data:",
		"font-src 'self'",
		"connect-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		`form-action 'self'${fournisseur ? ` ${fournisseur}` : ""}`,
		"frame-ancestors 'none'",
	]
	if (https) {
		directives.push("upgrade-insecure-requests")
	}
	return directives.join("; ")
}

/**
 * @param appUrl adresse publique de l'application (`APP_URL`)
 * @returns la valeur de l'en-tête HSTS si l'application est servie en HTTPS, sinon null (jamais en
 *          HTTP local : le navigateur refuserait ensuite le site en HTTP)
 */
export function enTeteHsts(appUrl: string | undefined): string | null {
	return appUrl?.startsWith("https:") ? `max-age=${DUREE_HSTS_SECONDES}` : null
}

function origine(url: string | undefined): string | null {
	if (!url) {
		return null
	}
	try {
		return new URL(url).origin
	} catch {
		return null
	}
}
