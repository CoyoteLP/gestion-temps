import { refresh } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { enregistrerMonCompte, modifierMonProfil } from "@/lib/api/utilisateurs"
import { jetonAccesRenouvele } from "@/lib/auth/session"

import { finaliserInscription, modifierProfil } from "./actions"

vi.mock("next/cache", () => ({ refresh: vi.fn() }))
vi.mock("@/lib/auth/session", () => ({ jetonAccesRenouvele: vi.fn() }))
vi.mock("@/lib/api/utilisateurs", () => ({
	enregistrerMonCompte: vi.fn(),
	modifierMonProfil: vi.fn(),
}))

const modifierSimule = vi.mocked(modifierMonProfil)
const enregistrerSimule = vi.mocked(enregistrerMonCompte)
const refreshSimule = vi.mocked(refresh)
const renouvelerSimule = vi.mocked(jetonAccesRenouvele)

beforeEach(() => {
	modifierSimule.mockReset()
	enregistrerSimule.mockReset()
	refreshSimule.mockReset()
	renouvelerSimule.mockReset()
	renouvelerSimule.mockResolvedValue("jeton-renouvele")
})

describe("modifierProfil", () => {
	it("enregistre le profil nettoyé avec la version lue, puis rafraîchit la page", async () => {
		modifierSimule.mockResolvedValue({} as never)

		await expect(modifierProfil({ nom: " Durand ", prenom: "Jeanne" }, 4)).resolves.toEqual({
			statut: "succes",
		})
		expect(modifierSimule).toHaveBeenCalledWith({ nom: "Durand", prenom: "Jeanne", version: 4 })
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("refuse un profil invalide sans appeler l'API", async () => {
		const etat = await modifierProfil({ nom: "", prenom: "Jeanne" }, 4)

		expect(etat).toEqual({ statut: "invalide", erreurs: { nom: "Le nom est obligatoire" } })
		expect(modifierSimule).not.toHaveBeenCalled()
	})

	it.each([-1, 1.5, Number.NaN])("refuse une version invalide (%s)", async (version) => {
		const etat = await modifierProfil({ nom: "Durand", prenom: "Jeanne" }, version)

		expect(etat.statut).toBe("erreur")
		expect(modifierSimule).not.toHaveBeenCalled()
	})

	it("signale une modification concurrente (409)", async () => {
		modifierSimule.mockRejectedValue(new ApiError(409, "La ressource a été modifiée", "id-409"))

		await expect(modifierProfil({ nom: "Durand", prenom: "Jeanne" }, 4)).resolves.toEqual({
			statut: "conflit",
			message: "La ressource a été modifiée",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})

	it("renvoie le message de l'API et sa référence pour les autres erreurs", async () => {
		modifierSimule.mockRejectedValue(new ApiError(400, "nom : ne doit pas être vide", "id-400"))

		await expect(modifierProfil({ nom: "Durand", prenom: "Jeanne" }, 4)).resolves.toEqual({
			statut: "erreur",
			message: "nom : ne doit pas être vide",
			identifiantCorrelation: "id-400",
		})
	})

	it("laisse remonter une erreur qui ne vient pas de l'API", async () => {
		modifierSimule.mockRejectedValue(new Error("panne"))

		await expect(modifierProfil({ nom: "Durand", prenom: "Jeanne" }, 4)).rejects.toThrow("panne")
	})
})

describe("finaliserInscription", () => {
	it("crée la fiche avec un jeton renouvelé (email vérifié depuis la connexion), puis rafraîchit la page", async () => {
		enregistrerSimule.mockResolvedValue({} as never)

		await expect(finaliserInscription()).resolves.toEqual({ statut: "succes" })
		expect(renouvelerSimule).toHaveBeenCalled()
		expect(enregistrerSimule).toHaveBeenCalledWith("jeton-renouvele")
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("demande de se reconnecter si le jeton ne peut pas être renouvelé", async () => {
		renouvelerSimule.mockResolvedValue(null)

		await expect(finaliserInscription()).resolves.toEqual({
			statut: "erreur",
			message: "Votre session a expiré : reconnectez-vous.",
		})
		expect(enregistrerSimule).not.toHaveBeenCalled()
	})

	it("considère une fiche déjà enregistrée comme un succès", async () => {
		enregistrerSimule.mockRejectedValue(new ApiError(409, "Votre compte est déjà enregistré", "id"))

		await expect(finaliserInscription()).resolves.toEqual({ statut: "succes" })
		expect(refreshSimule).toHaveBeenCalled()
	})

	it("renvoie le refus de l'API (email non vérifié)", async () => {
		enregistrerSimule.mockRejectedValue(
			new ApiError(422, "Votre adresse email doit être vérifiée", "id-422"),
		)

		await expect(finaliserInscription()).resolves.toEqual({
			statut: "erreur",
			message: "Votre adresse email doit être vérifiée",
			identifiantCorrelation: "id-422",
		})
		expect(refreshSimule).not.toHaveBeenCalled()
	})
})
