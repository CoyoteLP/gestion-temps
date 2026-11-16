import { mkdirSync } from "node:fs"
import path from "node:path"

import { test as preparation } from "@playwright/test"

import {
	appelApi,
	bornesDuMois,
	codeProjet,
	COMPTES,
	jetonAdministrateur,
	joursSaisis,
	moisPrecedent,
	TACHE,
	TOTAL_HEURES,
} from "./outils"

/**
 * Prépare les données de l'exécution par l'API, avec un jeton administrateur du client de test
 * `gestion-temps-dev` : fiches de `jdupont` et `pmartin` (réutilisées d'une exécution à l'autre),
 * un projet propre à l'exécution (code unique : relançable sans réinitialiser la pile), une
 * tâche, `jdupont` responsable, `pmartin` contributeur, et des saisies de `pmartin` le mois
 * précédent (après avoir effacé celles des exécutions précédentes : pile de test uniquement).
 * Les tests recalculent ces valeurs : rien n'est écrit sur disque, hormis les sessions.
 */
preparation("prépare les comptes, le projet et les saisies", async () => {
	mkdirSync(path.join(__dirname, ".etat"), { recursive: true })
	const jeton = await jetonAdministrateur()
	const api = <T>(methode: string, chemin: string, corps?: unknown) =>
		appelApi<T>(jeton, methode, chemin, corps)

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

	const code = codeProjet()
	const projet = await api<{ id: number }>("POST", "/api/projets", {
		code,
		nom: `Projet E2E ${code}`,
		actif: true,
	})
	const { id: tacheId } = await api<{ id: number }>("POST", "/api/taches", {
		projetId: projet.id,
		libelle: TACHE,
	})
	await api("POST", `/api/projets/${projet.id}/membres`, { utilisateurId: jdupont, role: "MANAGER" })
	await api("POST", `/api/projets/${projet.id}/membres`, {
		utilisateurId: pmartin,
		role: "CONTRIBUTEUR",
	})

	const mois = moisPrecedent()
	// Pile relançable : un mois laissé clôturé par une exécution interrompue est rouvert, et les
	// saisies de pmartin des exécutions précédentes sont effacées (24 h par jour au plus)
	const clotures = await api<{ contenu: { id: number }[] }>("GET", `/api/clotures?mois=${mois}&taille=100`)
	for (const cloture of clotures.contenu) {
		await api("DELETE", `/api/clotures/${cloture.id}`)
	}
	const [premier, dernier] = bornesDuMois(mois)
	const anciennes = await api<{ contenu: { id: number }[] }>(
		"GET",
		`/api/saisies-temps?utilisateurId=${pmartin}&du=${premier}&au=${dernier}&taille=100`,
	)
	for (const saisie of anciennes.contenu) {
		await api("DELETE", `/api/saisies-temps/${saisie.id}`)
	}

	const jours = joursSaisis()
	for (const jour of jours) {
		await api("POST", "/api/saisies-temps", {
			utilisateurId: pmartin,
			tacheId,
			jour,
			duree: TOTAL_HEURES / jours.length,
		})
	}
})
