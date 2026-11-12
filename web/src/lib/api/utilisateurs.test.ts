import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { ApiError } from "./erreurs"
import type { Utilisateur } from "./modeles"
import { enregistrerMonCompte, lireMonCompte, modifierMonProfil } from "./utilisateurs"

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
