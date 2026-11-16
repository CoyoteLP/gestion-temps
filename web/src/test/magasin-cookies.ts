/**
 * Doublure du magasin de cookies de `next/headers` (`await cookies()`) pour les tests : garde les
 * cookies en mémoire ; un cookie vidé ou expiré (`maxAge: 0`, valeur vide) est retiré.
 */
export function magasinCookies(initiaux: Record<string, string> = {}) {
	const valeurs = new Map(Object.entries(initiaux))
	return {
		valeurs,
		get: (nom: string) => (valeurs.has(nom) ? { name: nom, value: valeurs.get(nom) ?? "" } : undefined),
		getAll: () => [...valeurs].map(([name, value]) => ({ name, value })),
		set: (nom: string, valeur: string, options?: { maxAge?: number }) => {
			if (!valeur || options?.maxAge === 0) {
				valeurs.delete(nom)
			} else {
				valeurs.set(nom, valeur)
			}
		},
	}
}

/** Secret de test d'au moins 32 caractères, comme l'exige `iron-session`. */
export const SECRET_DE_TEST = "secret-de-test-de-trente-deux-caracteres-au-moins"
