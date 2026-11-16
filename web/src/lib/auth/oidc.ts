import "server-only"

import * as client from "openid-client"

let configuration: Promise<client.Configuration> | undefined

/**
 * Configuration du client OIDC (`openid-client`), lue une fois par processus depuis le document de
 * découverte du fournisseur (`OIDC_ISSUER_URI`). Client public (PKCE seul) par défaut, confidentiel
 * si `OIDC_CLIENT_SECRET` est défini. Un émetteur en `http` n'est accepté que pour le développement
 * local (Keycloak de dev).
 *
 * @returns la configuration du client
 * @throws Error si une variable manque ou si le fournisseur est injoignable ; un nouvel essai aura
 *         lieu au prochain appel
 */
export function configurationOidc(): Promise<client.Configuration> {
	configuration ??= chargerConfiguration().catch((erreur: unknown) => {
		configuration = undefined
		throw erreur
	})
	return configuration
}

async function chargerConfiguration(): Promise<client.Configuration> {
	const emetteur = process.env.OIDC_ISSUER_URI?.replace(/\/$/, "")
	const identifiant = process.env.OIDC_CLIENT_ID
	if (!emetteur || !identifiant) {
		throw new Error("OIDC_ISSUER_URI et OIDC_CLIENT_ID doivent être définis")
	}
	const secret = process.env.OIDC_CLIENT_SECRET
	const url = new URL(emetteur)
	return client.discovery(
		url,
		identifiant,
		undefined,
		secret ? client.ClientSecretPost(secret) : client.None(),
		url.protocol === "http:" ? { execute: [client.allowInsecureRequests] } : undefined,
	)
}

/** Réinitialise la configuration mémorisée (tests uniquement). */
export function oublierConfigurationOidc(): void {
	configuration = undefined
}
