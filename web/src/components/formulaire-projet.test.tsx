import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Projet } from "@/lib/api/modeles"
import { creerProjetAction, modifierProjetAction } from "@/lib/projets/actions"

import { FormulaireProjet } from "./formulaire-projet"

const naviguer = vi.fn()
const rafraichir = vi.fn()

vi.mock("@/lib/projets/actions", () => ({ creerProjetAction: vi.fn(), modifierProjetAction: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: naviguer, refresh: rafraichir }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const creerSimule = vi.mocked(creerProjetAction)
const modifierSimule = vi.mocked(modifierProjetAction)

const projet: Projet = {
	id: 12,
	version: 3,
	code: "APP",
	nom: "Application",
	description: null,
	dateDebut: "2026-01-01",
	dateFin: null,
	actif: true,
	audit: null,
}

beforeEach(() => {
	creerSimule.mockReset()
	modifierSimule.mockReset()
	naviguer.mockReset()
	rafraichir.mockReset()
	vi.mocked(toast.success).mockReset()
})

const enregistrer = () => userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }))

describe("FormulaireProjet en création", () => {
	beforeEach(() => {
		render(<FormulaireProjet />)
	})

	it("propose un projet actif, sans période", () => {
		expect(screen.getByLabelText("Code")).toHaveValue("")
		expect(screen.getByLabelText("Date de début (facultative)")).toHaveValue("")
		expect(screen.getByRole("checkbox", { name: /Actif/ })).toBeChecked()
	})

	it("crée le projet puis ouvre sa fiche", async () => {
		creerSimule.mockResolvedValue({ statut: "succes", id: 12 })

		await userEvent.type(screen.getByLabelText("Code"), "APP")
		await userEvent.type(screen.getByLabelText("Nom"), "Application")
		await enregistrer()

		expect(creerSimule).toHaveBeenCalledWith({
			code: "APP",
			nom: "Application",
			description: "",
			dateDebut: "",
			dateFin: "",
			actif: true,
		})
		expect(toast.success).toHaveBeenCalledWith("Le projet a été créé.", { duration: 10_000 })
		expect(naviguer).toHaveBeenCalledWith("/projets/12")
	})

	it("refuse les champs obligatoires vides sans appeler le serveur", async () => {
		await enregistrer()

		expect(await screen.findByText("Le code est obligatoire")).toBeInTheDocument()
		expect(screen.getByText("Le nom est obligatoire")).toBeInTheDocument()
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("refuse une date de fin antérieure à la date de début", async () => {
		await userEvent.type(screen.getByLabelText("Code"), "APP")
		await userEvent.type(screen.getByLabelText("Nom"), "Application")
		await userEvent.type(screen.getByLabelText("Date de début (facultative)"), "2026-06-01")
		await userEvent.type(screen.getByLabelText("Date de fin (facultative)"), "2026-01-01")
		await enregistrer()

		expect(
			await screen.findByText("La date de fin doit être postérieure ou égale à la date de début"),
		).toBeInTheDocument()
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("affiche sous le champ code un code déjà utilisé", async () => {
		creerSimule.mockResolvedValue({
			statut: "invalide",
			erreurs: { code: "Un projet avec le code 'APP' existe déjà" },
		})

		await userEvent.type(screen.getByLabelText("Code"), "APP")
		await userEvent.type(screen.getByLabelText("Nom"), "Application")
		await enregistrer()

		expect(await screen.findByText("Un projet avec le code 'APP' existe déjà")).toBeInTheDocument()
		expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true")
		expect(naviguer).not.toHaveBeenCalled()
	})
})

describe("FormulaireProjet en modification", () => {
	beforeEach(() => {
		render(<FormulaireProjet projet={projet} />)
	})

	it("reprend le projet et l'enregistre avec la version lue", async () => {
		modifierSimule.mockResolvedValue({ statut: "succes", id: 12 })

		expect(screen.getByLabelText("Date de début (facultative)")).toHaveValue("2026-01-01")
		await userEvent.click(screen.getByRole("checkbox", { name: /Actif/ }))
		await enregistrer()

		expect(modifierSimule).toHaveBeenCalledWith(
			12,
			expect.objectContaining({ code: "APP", actif: false }),
			3,
		)
		expect(toast.success).toHaveBeenCalledWith("Le projet a été modifié.", { duration: 10_000 })
		expect(naviguer).toHaveBeenCalledWith("/projets/12")
	})

	it("propose de recharger après une modification concurrente", async () => {
		modifierSimule.mockResolvedValue({ statut: "conflit", message: "Modifié entre-temps" })

		await enregistrer()
		await userEvent.click(await screen.findByRole("button", { name: /Recharger/ }))

		expect(screen.getByText("Modifié entre-temps")).toBeInTheDocument()
		expect(rafraichir).toHaveBeenCalled()
		expect(naviguer).not.toHaveBeenCalled()
	})

	it("ramène à la fiche du projet sur « Annuler »", () => {
		expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/projets/12")
	})
})
