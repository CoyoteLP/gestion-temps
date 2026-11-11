import "server-only"

/** Points de terminaison du fournisseur OIDC utilisés en dehors d'Auth.js. */
export type ConfigurationOidc = {
	token_endpoint: string
	end_session_endpoint?: string
}

let configuration: Promise<ConfigurationOidc> | undefined

/**
 * Lit (une fois par processus) le document de découverte du fournisseur OIDC
 * (`AUTH_KEYCLOAK_ISSUER/.well-known/openid-configuration`), sans rien supposer de Keycloak.
 *
 * @returns les points de terminaison du fournisseur
 * @throws Error si le document est inaccessible ; un nouvel essai aura lieu au prochain appel
 */
export function configurationOidc(): Promise<ConfigurationOidc> {
	configuration ??= chargerConfiguration().catch((erreur: unknown) => {
		configuration = undefined
		throw erreur
	})
	return configuration
}

async function chargerConfiguration(): Promise<ConfigurationOidc> {
	const emetteur = process.env.AUTH_KEYCLOAK_ISSUER?.replace(/\/$/, "")
	if (!emetteur) {
		throw new Error("AUTH_KEYCLOAK_ISSUER n'est pas défini")
	}
	const reponse = await fetch(`${emetteur}/.well-known/openid-configuration`, { cache: "no-store" })
	if (!reponse.ok) {
		throw new Error(`Découverte OIDC impossible (HTTP ${reponse.status})`)
	}
	return (await reponse.json()) as ConfigurationOidc
}

/** Réinitialise la configuration mémorisée (tests uniquement). */
export function oublierConfigurationOidc(): void {
	configuration = undefined
}
