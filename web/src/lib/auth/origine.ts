import "server-only"

import { headers } from "next/headers"

/**
 * Origine publique de l'application (`https://temps.exemple.fr`), pour l'adresse de retour du
 * fournisseur OIDC, celle de déconnexion et la redirection après la connexion.
 *
 * En production, elle vient **uniquement** de `APP_URL` : les en-têtes `Host` et `X-Forwarded-*`
 * sont fournis par le client et ne doivent pas décider d'une redirection. En développement, sans
 * `APP_URL`, elle est déduite de la requête.
 *
 * @returns l'origine, sans barre finale
 * @throws Error en production si `APP_URL` n'est pas définie
 */
export async function origineApplication(): Promise<string> {
	if (process.env.APP_URL) {
		return new URL(process.env.APP_URL).origin
	}
	if (process.env.NODE_ENV === "production") {
		throw new Error("APP_URL doit être définie en production (adresse publique de l'application)")
	}
	const entetes = await headers()
	const protocole = entetes.get("x-forwarded-proto") ?? "http"
	const hote = entetes.get("x-forwarded-host") ?? entetes.get("host")
	return `${protocole}://${hote}`
}
