import { PAGE_ACCUEIL } from "@/lib/constantes"

/**
 * Page où revenir après la connexion. Seul un chemin relatif de l'application est accepté
 * (`//hote` et `/\hote` désignent un autre site pour le navigateur), pour éviter toute redirection
 * vers un site externe.
 *
 * @param valeur chemin reçu (paramètre `retour`)
 * @returns ce chemin s'il est sûr, sinon la page d'accueil
 */
export function cheminDeRetour(valeur: unknown): string {
	return typeof valeur === "string" && /^\/(?![/\\])/.test(valeur) ? valeur : PAGE_ACCUEIL
}

/**
 * Le proxy d'Auth.js passe la page demandée en URL absolue (`callbackUrl`) : seul son chemin est
 * gardé, quelle que soit l'origine indiquée.
 *
 * @param valeur paramètre `callbackUrl` de la page de connexion
 * @returns le chemin et la requête de cette URL, ou une chaîne vide s'il n'y en a pas
 */
export function cheminDepuisUrl(valeur: string | string[] | undefined): string {
	if (typeof valeur !== "string" || !valeur) {
		return ""
	}
	try {
		const url = new URL(valeur, "https://application.invalid")
		return cheminDeRetour(`${url.pathname}${url.search}`)
	} catch {
		return ""
	}
}
