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

/**
 * Code du projet propre à l'exécution, fixé une fois par playwright.config.ts et transmis aux
 * processus de test par l'environnement (aucune donnée partagée par fichier).
 */
export function codeProjet(): string {
	const code = process.env.E2E_CODE_PROJET
	if (!code) {
		throw new Error("E2E_CODE_PROJET n'est pas défini : lancer les tests par playwright.config.ts")
	}
	return code
}

/** Tâche du projet de l'exécution. */
export const TACHE = "Développement"

/** Saisies de `pmartin` préparées le mois précédent : durée et nombre. */
const HEURES_PAR_SAISIE = 7
const NOMBRE_SAISIES = 3

/** Heures saisies par `pmartin` le mois précédent. */
export const TOTAL_HEURES = HEURES_PAR_SAISIE * NOMBRE_SAISIES

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

/** Mois précédent (`AAAA-MM`), où `pmartin` a des saisies. */
export function moisPrecedent(): string {
	const [annee, numero] = aujourdhui().slice(0, 7).split("-").map(Number)
	return new Date(Date.UTC(annee, numero - 2, 1)).toISOString().slice(0, 7)
}

/** Premier et dernier jours (`AAAA-MM-JJ`) d'un mois. */
export function bornesDuMois(mois: string): [string, string] {
	const [annee, numero] = mois.split("-").map(Number)
	return [`${mois}-01`, new Date(Date.UTC(annee, numero, 0)).toISOString().slice(0, 10)]
}

/** Jours (`AAAA-MM-JJ`) des saisies de `pmartin` : les premiers jours ouvrés du mois précédent. */
export function joursSaisis(): string[] {
	const jours: string[] = []
	const date = new Date(`${moisPrecedent()}-01T12:00:00Z`)
	while (jours.length < NOMBRE_SAISIES) {
		if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
			jours.push(date.toISOString().slice(0, 10))
		}
		date.setUTCDate(date.getUTCDate() + 1)
	}
	return jours
}

/** Jeton administrateur du client de test `gestion-temps-dev` (mot de passe direct). */
export async function jetonAdministrateur(): Promise<string> {
	const reponse = await fetch(`${URL_KEYCLOAK}/realms/gestion-temps/protocol/openid-connect/token`, {
		method: "POST",
		body: new URLSearchParams({
			client_id: "gestion-temps-dev",
			grant_type: "password",
			username: COMPTES.admin.identifiant,
			password: COMPTES.admin.identifiant,
		}),
	})
	if (!reponse.ok) {
		throw new Error(`Jeton administrateur refusé par Keycloak : HTTP ${reponse.status}`)
	}
	return ((await reponse.json()) as { access_token: string }).access_token
}

/**
 * Appel à l'API de la pile de test, avec le jeton donné.
 *
 * @returns le champ `data` de la réponse
 * @throws Error si l'API répond une erreur
 */
export async function appelApi<T>(
	jeton: string,
	methode: string,
	chemin: string,
	corps?: unknown,
): Promise<T> {
	const reponse = await fetch(`${URL_API}${chemin}`, {
		method: methode,
		headers: {
			Authorization: `Bearer ${jeton}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: corps === undefined ? undefined : JSON.stringify(corps),
	})
	const enveloppe = (await reponse.json()) as { data: T; message: string | null }
	if (!reponse.ok) {
		throw new Error(`${methode} ${chemin} : HTTP ${reponse.status} ${enveloppe.message}`)
	}
	return enveloppe.data
}

/** Identifiant du projet de l'exécution, relu par l'API (gardé en mémoire seulement). */
export async function idDuProjet(): Promise<number> {
	const code = codeProjet()
	const page = await appelApi<{ contenu: { id: number; code: string }[] }>(
		await jetonAdministrateur(),
		"GET",
		`/api/projets?code=${encodeURIComponent(code)}`,
	)
	const projet = page.contenu.find((candidat) => candidat.code === code)
	if (!projet) {
		throw new Error(`Projet ${code} introuvable : la préparation a-t-elle réussi ?`)
	}
	return projet.id
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
