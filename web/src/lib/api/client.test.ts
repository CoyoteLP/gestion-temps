import { beforeEach, describe, expect, it, vi } from "vitest"

import { EN_TETE_CORRELATION } from "@/lib/constantes"

import { apiFetch, construireUrl } from "./client"
import { ApiError, STATUT_API_INJOIGNABLE } from "./erreurs"

vi.mock("@/lib/auth/session", () => ({ jetonAcces: vi.fn(async () => "jeton-acces") }))
// Hors d'une requête Next.js, connection() échouerait : simulé
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }))

const fetchSimule = vi.fn<typeof fetch>()

beforeEach(() => {
	vi.stubEnv("API_URL", "http://api.test:8080")
	vi.stubGlobal("fetch", fetchSimule)
	vi.spyOn(console, "error").mockImplementation(() => {})
	fetchSimule.mockReset()
})

/** Erreur levée par la promesse, pour en vérifier les propriétés. */
async function erreurDe(promesse: Promise<unknown>): Promise<ApiError> {
	const erreur = await promesse.then(
		() => null,
		(e: unknown) => e,
	)
	expect(erreur).toBeInstanceOf(ApiError)
	return erreur as ApiError
}

describe("apiFetch", () => {
	it("renvoie le champ data d'une réponse en succès", async () => {
		fetchSimule.mockResolvedValue(Response.json({ status: "success", data: { id: 1 }, message: null }))

		await expect(apiFetch("/api/projets/1")).resolves.toEqual({ id: 1 })
	})

	it("transmet le jeton d'accès et un identifiant de corrélation", async () => {
		fetchSimule.mockResolvedValue(Response.json({ status: "success", data: null, message: null }))

		await apiFetch("/api/projets")

		const [url, requete] = fetchSimule.mock.calls[0]
		const entetes = requete?.headers as Record<string, string>
		expect(url).toBe("http://api.test:8080/api/projets")
		expect(requete?.method).toBe("GET")
		expect(requete?.cache).toBe("no-store")
		expect(entetes.Authorization).toBe("Bearer jeton-acces")
		expect(entetes[EN_TETE_CORRELATION]).toMatch(/^[0-9a-f-]{36}$/)
		expect(entetes["Content-Type"]).toBeUndefined()
	})

	it("utilise le jeton explicite à la place de celui de la session", async () => {
		fetchSimule.mockResolvedValue(Response.json({ status: "success", data: null, message: null }))

		await apiFetch("/api/utilisateurs/moi", { methode: "POST", jeton: "jeton-connexion" })

		const entetes = fetchSimule.mock.calls[0][1]?.headers as Record<string, string>
		expect(entetes.Authorization).toBe("Bearer jeton-connexion")
	})

	it("envoie le corps en JSON", async () => {
		fetchSimule.mockResolvedValue(
			Response.json({ status: "success", data: { id: 2 }, message: null }, { status: 201 }),
		)

		await apiFetch("/api/projets", { methode: "POST", corps: { code: "P1" } })

		const [, requete] = fetchSimule.mock.calls[0]
		expect(requete?.method).toBe("POST")
		expect(requete?.body).toBe('{"code":"P1"}')
		expect((requete?.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
	})

	it("lève une ApiError portant le message et l'identifiant de corrélation de l'API", async () => {
		fetchSimule.mockResolvedValue(
			Response.json(
				{ status: "error", data: null, message: "Un projet avec ce code existe déjà" },
				{ status: 409, headers: { [EN_TETE_CORRELATION]: "id-api" } },
			),
		)

		const erreur = await erreurDe(apiFetch("/api/projets", { methode: "POST", corps: {} }))

		expect(erreur.statut).toBe(409)
		expect(erreur.message).toBe("Un projet avec ce code existe déjà")
		expect(erreur.identifiantCorrelation).toBe("id-api")
	})

	it("utilise un message par défaut si la réponse d'erreur n'est pas l'enveloppe de l'API", async () => {
		fetchSimule.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 }))

		const erreur = await erreurDe(apiFetch("/api/projets"))

		expect(erreur.statut).toBe(502)
		expect(erreur.message).toBe("Une erreur inattendue s'est produite. Réessayez plus tard.")
	})

	it("signale une API injoignable avec l'identifiant de corrélation envoyé", async () => {
		fetchSimule.mockRejectedValue(new TypeError("fetch failed"))

		const erreur = await erreurDe(apiFetch("/api/projets"))

		const envoye = (fetchSimule.mock.calls[0][1]?.headers as Record<string, string>)[EN_TETE_CORRELATION]
		expect(erreur.statut).toBe(STATUT_API_INJOIGNABLE)
		expect(erreur.message).toMatch(/momentanément indisponible/)
		expect(erreur.identifiantCorrelation).toBe(envoye)
	})

	it("refuse une réponse 200 qui n'est pas un succès de l'API", async () => {
		fetchSimule.mockResolvedValue(new Response("pas du JSON", { status: 200 }))

		expect((await erreurDe(apiFetch("/api/projets"))).statut).toBe(200)
	})
})

describe("construireUrl", () => {
	it("encode les paramètres et omet les valeurs vides", () => {
		expect(
			construireUrl("/api/saisies-temps", {
				du: "2026-11-01",
				projetId: 3,
				tacheId: undefined,
				au: null,
				q: "",
			}),
		).toBe("http://api.test:8080/api/saisies-temps?du=2026-11-01&projetId=3")
	})

	it("échoue si API_URL n'est pas défini", () => {
		vi.stubEnv("API_URL", "")
		expect(() => construireUrl("/api/projets")).toThrow("API_URL")
	})

	it.each(["/api/projets/12", "/api/projets/12/membres/5", "/api/utilisateurs/moi"])(
		"garde l'hôte d'API_URL pour un chemin d'API (%s)",
		(chemin) => {
			expect(construireUrl(chemin)).toBe(`http://api.test:8080${chemin}`)
		},
	)

	it.each([
		"//autre-hote.test/api/projets",
		"http://autre-hote.test/api/projets",
		"/api/../actuator/env",
		"/api/projets/12/",
		"/api/projets/1\r\nX: y",
		"/autre/chemin",
		"api/projets",
		"/api",
	])("refuse un chemin qui n'est pas un chemin d'API simple (%s)", (chemin) => {
		expect(() => construireUrl(chemin)).toThrow("Chemin d'API invalide")
	})
})

describe("apiFetch et un chemin invalide", () => {
	it("n'envoie aucune requête, donc aucun jeton", async () => {
		await expect(apiFetch("//autre-hote.test/vol")).rejects.toThrow("Chemin d'API invalide")
		expect(fetchSimule).not.toHaveBeenCalled()
	})
})
