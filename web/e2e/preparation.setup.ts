import { mkdirSync } from "node:fs"
import path from "node:path"

import { test as preparation } from "@playwright/test"

import { aujourdhui, COMPTES, type DonneesE2E, enregistrerDonnees, URL_API, URL_KEYCLOAK } from "./outils"

/**
 * Prépare les données de l'exécution par l'API, avec un jeton administrateur du client de test
 * `gestion-temps-dev` : fiches de `jdupont` et `pmartin` (réutilisées d'une exécution à l'autre),
 * un projet propre à l'exécution (code unique : relançable sans réinitialiser la pile), une
 * tâche, `jdupont` responsable, `pmartin` contributeur, et trois saisies de `pmartin` le mois
 * précédent (après avoir effacé celles des exécutions précédentes : pile de test uniquement).
 */
preparation("prépare les comptes, le projet et les saisies", async () => {
	mkdirSync(path.join(__dirname, ".etat"), { recursive: true })
	const jeton = await jetonAdministrateur()
	const api = async <T>(methode: string, chemin: string, corps?: unknown): Promise<T> => {
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

	const fiche = async (compte: "jdupont" | "pmartin"): Promise<number> => {
		const { email, nom, prenom } = COMPTES[compte]
		const existantes = await api<{ contenu: { id: number; email: string }[] }>(
			"GET",
			`/api/utilisateurs?email=${encodeURIComponent(email)}&actif=true`,
		)
		const existante = existantes.contenu.find((utilisateur) => utilisateur.email === email)
		if (existante) {
			return existante.id
		}
		return (await api<{ id: number }>("POST", "/api/utilisateurs", { email, nom, prenom, actif: true }))
			.id
	}
	const jdupont = await fiche("jdupont")
	const pmartin = await fiche("pmartin")

	const codeProjet = `E2E-${Date.now() % 100_000_000}`
	const projet = await api<{ id: number }>("POST", "/api/projets", {
		code: codeProjet,
		nom: `Projet E2E ${codeProjet}`,
		actif: true,
	})
	const tache = "Développement"
	const { id: tacheId } = await api<{ id: number }>("POST", "/api/taches", {
		projetId: projet.id,
		libelle: tache,
	})
	await api("POST", `/api/projets/${projet.id}/membres`, { utilisateurId: jdupont, role: "MANAGER" })
	await api("POST", `/api/projets/${projet.id}/membres`, {
		utilisateurId: pmartin,
		role: "CONTRIBUTEUR",
	})

	const moisPrecedent = decalerMois(aujourdhui().slice(0, 7), -1)
	// Pile relançable : un mois laissé clôturé par une exécution interrompue est rouvert, et les
	// saisies de pmartin des exécutions précédentes sont effacées (24 h par jour au plus)
	const clotures = await api<{ contenu: { id: number }[] }>(
		"GET",
		`/api/clotures?mois=${moisPrecedent}&taille=100`,
	)
	for (const cloture of clotures.contenu) {
		await api("DELETE", `/api/clotures/${cloture.id}`)
	}
	const [premier, dernier] = bornesDuMois(moisPrecedent)
	const anciennes = await api<{ contenu: { id: number }[] }>(
		"GET",
		`/api/saisies-temps?utilisateurId=${pmartin}&du=${premier}&au=${dernier}&taille=100`,
	)
	for (const saisie of anciennes.contenu) {
		await api("DELETE", `/api/saisies-temps/${saisie.id}`)
	}

	const joursSaisis = premiersJoursOuvres(moisPrecedent, 3)
	for (const jour of joursSaisis) {
		await api("POST", "/api/saisies-temps", { utilisateurId: pmartin, tacheId, jour, duree: 7 })
	}

	const donnees: DonneesE2E = {
		projetId: projet.id,
		codeProjet,
		tache,
		moisPrecedent,
		joursSaisis,
		totalHeures: 7 * joursSaisis.length,
	}
	enregistrerDonnees(donnees)
})

async function jetonAdministrateur(): Promise<string> {
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

function decalerMois(mois: string, nombre: number): string {
	const [annee, numero] = mois.split("-").map(Number)
	const date = new Date(Date.UTC(annee, numero - 1 + nombre, 1))
	return date.toISOString().slice(0, 7)
}

function bornesDuMois(mois: string): [string, string] {
	const [annee, numero] = mois.split("-").map(Number)
	const dernier = new Date(Date.UTC(annee, numero, 0)).toISOString().slice(0, 10)
	return [`${mois}-01`, dernier]
}

function premiersJoursOuvres(mois: string, nombre: number): string[] {
	const jours: string[] = []
	const date = new Date(`${mois}-01T12:00:00Z`)
	while (jours.length < nombre) {
		if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
			jours.push(date.toISOString().slice(0, 10))
		}
		date.setUTCDate(date.getUTCDate() + 1)
	}
	return jours
}
