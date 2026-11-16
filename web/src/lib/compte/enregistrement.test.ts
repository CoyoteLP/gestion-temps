import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/erreurs"
import { enregistrerMonCompte } from "@/lib/api/utilisateurs"

import { enregistrerALaConnexion } from "./enregistrement"

vi.mock("@/lib/api/utilisateurs", () => ({ enregistrerMonCompte: vi.fn() }))

const enregistrerSimule = vi.mocked(enregistrerMonCompte)

/** Jeton JWT non signé portant la charge donnée (seule la charge est lue). */
function jwt(charge: object): string {
	return `entete.${Buffer.from(JSON.stringify(charge)).toString("base64url")}.signature`
}

const JETON_COLLABORATEUR = jwt({ roles: [], email: "nouveau@exemple.fr" })

let avertissement: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	enregistrerSimule.mockReset()
	avertissement = vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("enregistrerALaConnexion", () => {
	it("crée la fiche d'un utilisateur qui n'est pas administrateur", async () => {
		enregistrerSimule.mockResolvedValue({} as never)

		await enregistrerALaConnexion(JETON_COLLABORATEUR)

		expect(enregistrerSimule).toHaveBeenCalledWith(JETON_COLLABORATEUR)
		expect(avertissement).not.toHaveBeenCalled()
	})

	it("ne crée pas de fiche pour un administrateur", async () => {
		await enregistrerALaConnexion(jwt({ roles: ["ADMIN"] }))

		expect(enregistrerSimule).not.toHaveBeenCalled()
	})

	it("ne fait rien sans jeton d'accès", async () => {
		await enregistrerALaConnexion(undefined)

		expect(enregistrerSimule).not.toHaveBeenCalled()
	})

	it("accepte sans bruit une fiche déjà enregistrée", async () => {
		enregistrerSimule.mockRejectedValue(new ApiError(409, "Votre compte est déjà enregistré", "id"))

		await expect(enregistrerALaConnexion(JETON_COLLABORATEUR)).resolves.toBeUndefined()
		expect(avertissement).not.toHaveBeenCalled()
	})

	it("journalise un refus sans bloquer la connexion ni journaliser le message", async () => {
		enregistrerSimule.mockRejectedValue(
			new ApiError(422, "Votre adresse email nouveau@exemple.fr doit être vérifiée", "id-422"),
		)

		await expect(enregistrerALaConnexion(JETON_COLLABORATEUR)).resolves.toBeUndefined()

		const journal = avertissement.mock.calls.flat().join(" ")
		expect(journal).toContain("HTTP 422")
		expect(journal).toContain("id-422")
		expect(journal).not.toContain("nouveau@exemple.fr")
		expect(journal).not.toContain(JETON_COLLABORATEUR)
	})

	it("journalise une erreur inattendue sans bloquer la connexion", async () => {
		enregistrerSimule.mockRejectedValue(new Error("API_URL n'est pas défini"))

		await expect(enregistrerALaConnexion(JETON_COLLABORATEUR)).resolves.toBeUndefined()
		expect(avertissement.mock.calls.flat().join(" ")).toContain("Error")
	})
})
