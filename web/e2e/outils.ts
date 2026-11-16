import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { test as base, expect, type Page } from "@playwright/test"

/** Comptes du royaume de dev (docker/keycloak/realm-gestion-temps.json) : mot de passe = identifiant. */
export const COMPTES = {
	admin: { identifiant: "admin", nom: "Administrateur" },
	jdupont: { identifiant: "jdupont", email: "jdupont@lirox.test", prenom: "Jean", nom: "Dupont" },
	pmartin: { identifiant: "pmartin", email: "pmartin@lirox.test", prenom: "Paul", nom: "Martin" },
} as const

export type Compte = keyof typeof COMPTES

/** Adresses de la pile de test (docker/e2e/compose.yaml), vues depuis le poste. */
export const URL_API = process.env.E2E_API_URL ?? "http://localhost:8090"
export const URL_KEYCLOAK = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8280"

const DOSSIER = path.join(__dirname, ".etat")

/** Fichier de session (cookies) d'un compte connecté, réutilisé par les tests. */
export const fichierSession = (compte: Compte) => path.join(DOSSIER, `session-${compte}.json`)

/** Données préparées par l'API pour l'exécution en cours. */
export type DonneesE2E = {
	projetId: number
	codeProjet: string
	tache: string
	/** Mois précédent (`AAAA-MM`), où `pmartin` a des saisies. */
	moisPrecedent: string
	/** Jours (`AAAA-MM-JJ`) des saisies de `pmartin` le mois précédent. */
	joursSaisis: string[]
	/** Heures saisies par `pmartin` le mois précédent. */
	totalHeures: number
}

const FICHIER_DONNEES = path.join(DOSSIER, "donnees.json")

export function enregistrerDonnees(donnees: DonneesE2E): void {
	writeFileSync(FICHIER_DONNEES, JSON.stringify(donnees, null, 2))
}

export function lireDonnees(): DonneesE2E {
	return JSON.parse(readFileSync(FICHIER_DONNEES, "utf8")) as DonneesE2E
}

/** Date du jour à Paris, `AAAA-MM-JJ` (même règle que l'application). */
export function aujourdhui(): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Paris",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date())
}

/** Lundi de la semaine d'une date `AAAA-MM-JJ`. */
export function lundiDe(jour: string): string {
	const date = new Date(`${jour}T12:00:00Z`)
	date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
	return date.toISOString().slice(0, 10)
}

/**
 * Connexion par le formulaire du fournisseur, depuis la page de connexion de l'application.
 *
 * @param page   page sur `/connexion`
 * @param compte compte à connecter
 */
export async function seConnecterChezLeFournisseur(page: Page, compte: Compte): Promise<void> {
	await page.getByRole("button", { name: "Se connecter" }).click()
	await page.waitForURL(/keycloak:8280/)
	const { identifiant } = COMPTES[compte]
	await page.locator("#username").fill(identifiant)
	await page.locator("#password").fill(identifiant)
	await page.locator("#kc-login").click()
}

/**
 * Test qui surveille la console de chaque page : à la fin, aucune violation de la politique de
 * sécurité du contenu (CSP) ni erreur JavaScript. Les échecs de chargement réseau (une page 404
 * attendue, par exemple) ne comptent pas.
 */
export const test = base.extend<{ surveillanceConsole: void }>({
	surveillanceConsole: [
		async ({ context }, utiliser) => {
			const erreurs: string[] = []
			await context.addInitScript(() => {
				document.addEventListener("securitypolicyviolation", (evenement) => {
					console.error(
						`Violation CSP : ${evenement.violatedDirective} ${evenement.blockedURI || "(en ligne)"}`,
					)
				})
			})
			const surveiller = (page: Page) => {
				page.on("console", (message) => {
					if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
						erreurs.push(`${page.url()} : ${message.text()}`)
					}
				})
				page.on("pageerror", (erreur) => erreurs.push(`${page.url()} : ${erreur.message}`))
			}
			context.pages().forEach(surveiller)
			context.on("page", surveiller)
			await utiliser()
			expect(erreurs, "erreurs de la console (CSP, JavaScript)").toEqual([])
		},
		{ auto: true },
	],
})

export { expect }
