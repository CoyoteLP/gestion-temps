import "server-only"

import { CHEMIN_CONSOLE_COMPTE } from "@/lib/constantes"

/**
 * Console de compte du fournisseur d'identité, où l'utilisateur change son mot de passe et son
 * email (gérés par le fournisseur, pas par l'API).
 *
 * @returns l'URL de la console, ou null si `AUTH_KEYCLOAK_ISSUER` n'est pas défini
 */
export function urlConsoleCompte(): string | null {
	const emetteur = process.env.AUTH_KEYCLOAK_ISSUER?.replace(/\/$/, "")
	return emetteur ? `${emetteur}${CHEMIN_CONSOLE_COMPTE}` : null
}
