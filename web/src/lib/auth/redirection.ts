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
