import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { ApiError } from "./erreurs"
import type { Utilisateur } from "./modeles"
import {
	enregistrerMonCompte,
	lireMonCompte,
	lireUtilisateur,
	listerTousLesUtilisateursActifs,
	listerUtilisateurs,
	modifierMonProfil,
	modifierUtilisateur,
} from "./utilisateurs"

vi.mock("./client", () => ({ apiFetch: vi.fn() }))

const apiFetchSimule = vi.mocked(apiFetch)

const fiche: Utilisateur = {
	id: 7,
	version: 2,
	email: "jdupont@exemple.fr",
	nom: "Dupont",
	prenom: "Jean",
	actif: true,
	audit: null,
}

beforeEach(() => {
	apiFetchSimule.mockReset()
})

describe("lireMonCompte", () => {
	it("renvoie la fiche de l'utilisateur connecté", async () => {
		apiFetchSimule.mockResolvedValue(fiche)

		await expect(lireMonCompte()).resolves.toEqual(fiche)
		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/moi")
	})

	it("renvoie null quand le compte n'a pas encore de fiche", async () => {
		apiFetchSimule.mockRejectedValue(new ApiError(404, "Votre compte n'est pas encore enregistré", "id"))

		await expect(lireMonCompte()).resolves.toBeNull()
	})

	it.each([403, 503])("propage les autres erreurs de l'API (%i)", async (statut) => {
		apiFetchSimule.mockRejectedValue(new ApiError(statut, "Refusé", "id"))

		await expect(lireMonCompte()).rejects.toMatchObject({ statut })
	})
})

describe("enregistrerMonCompte", () => {
	it("crée la fiche avec le jeton de la session", async () => {
		apiFetchSimule.mockResolvedValue({ ...fiche, actif: false })

		await enregistrerMonCompte()

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/moi", {
			methode: "POST",
			jeton: undefined,
		})
	})

	it("crée la fiche avec un jeton explicite à la connexion", async () => {
		apiFetchSimule.mockResolvedValue({ ...fiche, actif: false })

		await enregistrerMonCompte("jeton-connexion")

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/moi", {
			methode: "POST",
			jeton: "jeton-connexion",
		})
	})
})

describe("modifierMonProfil", () => {
	it("envoie le nom, le prénom et la version lue", async () => {
		apiFetchSimule.mockResolvedValue({ ...fiche, version: 3 })

		await expect(
			modifierMonProfil({ nom: "Durand", prenom: "Jeanne", version: 2 }),
		).resolves.toMatchObject({
			version: 3,
		})
		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/moi", {
			methode: "PUT",
			corps: { nom: "Durand", prenom: "Jeanne", version: 2 },
		})
	})
})

describe("listerUtilisateurs", () => {
	it("filtre sur le statut demandé", async () => {
		await listerUtilisateurs(false, 2)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs", {
			parametres: { actif: false, page: 2, taille: 20 },
		})
	})

	it("liste toutes les fiches sans filtre", async () => {
		await listerUtilisateurs(undefined, 1)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs", {
			parametres: { actif: undefined, page: 1, taille: 20 },
		})
	})
})

describe("listerTousLesUtilisateursActifs", () => {
	it("lit toutes les pages des fiches actives, par 100", async () => {
		apiFetchSimule
			.mockResolvedValueOnce({ contenu: [fiche], page: 1, taille: 100, total: 2, pages: 2 })
			.mockResolvedValueOnce({
				contenu: [{ ...fiche, id: 8 }],
				page: 2,
				taille: 100,
				total: 2,
				pages: 2,
			})

		await expect(listerTousLesUtilisateursActifs()).resolves.toHaveLength(2)
		expect(apiFetchSimule).toHaveBeenLastCalledWith("/api/utilisateurs", {
			parametres: { actif: true, page: 2, taille: 100 },
		})
	})
})

describe("fiche d'un utilisateur", () => {
	it("lit une fiche par son identifiant", async () => {
		apiFetchSimule.mockResolvedValue(fiche)

		await expect(lireUtilisateur(7)).resolves.toEqual(fiche)
		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/7")
	})

	it("renvoie la fiche complète avec la version lue", async () => {
		const corps = { email: fiche.email, nom: "Dupont", prenom: "Jean", actif: false, version: 2 }

		await modifierUtilisateur(7, corps)

		expect(apiFetchSimule).toHaveBeenCalledWith("/api/utilisateurs/7", { methode: "PUT", corps })
	})
})
