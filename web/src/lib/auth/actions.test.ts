import { beforeEach, describe, expect, it, vi } from "vitest"

import { signIn } from "@/auth"

import { sInscrire, seConnecter } from "./actions"

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }))

const signInSimule = vi.mocked(signIn)

function formulaire(retour: string): FormData {
	const donnees = new FormData()
	donnees.set("retour", retour)
	return donnees
}

beforeEach(() => {
	signInSimule.mockReset()
})

describe("seConnecter", () => {
	it("lance la connexion avec retour sur la page demandée", async () => {
		await seConnecter(formulaire("/profil"))

		expect(signInSimule).toHaveBeenCalledWith("keycloak", { redirectTo: "/profil" })
	})
})

describe("sInscrire", () => {
	it("ouvre le formulaire d'inscription du fournisseur (prompt=create)", async () => {
		await sInscrire(formulaire("/profil"))

		expect(signInSimule).toHaveBeenCalledWith("keycloak", { redirectTo: "/profil" }, { prompt: "create" })
	})

	it("refuse un retour vers un autre site", async () => {
		await sInscrire(formulaire("https://malveillant.example/piege"))

		expect(signInSimule.mock.calls[0][1]).toEqual({ redirectTo: "/projets" })
	})
})
