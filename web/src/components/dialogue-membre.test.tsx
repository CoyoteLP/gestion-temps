import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import { ajouterMembreAction, modifierMembreAction } from "@/lib/membres/actions"

import { DialogueMembre } from "./dialogue-membre"

vi.mock("@/lib/membres/actions", () => ({ ajouterMembreAction: vi.fn(), modifierMembreAction: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const ajouterSimule = vi.mocked(ajouterMembreAction)
const modifierSimule = vi.mocked(modifierMembreAction)

beforeEach(() => {
	ajouterSimule.mockReset()
	modifierSimule.mockReset()
	vi.mocked(toast.success).mockReset()
})

const ouvrir = () => userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
const enregistrer = () => userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

describe("DialogueMembre en ajout", () => {
	it("exige le choix d'un utilisateur", async () => {
		render(
			<DialogueMembre
				mode="ajout"
				projetId={3}
				candidats={[{ id: 7, libelle: "Léa Martin — lea@exemple.fr" }]}
				declencheur={<Button>Ouvrir</Button>}
			/>,
		)
		await ouvrir()

		await enregistrer()

		expect(await screen.findByText("Choisissez un utilisateur")).toBeInTheDocument()
		expect(ajouterSimule).not.toHaveBeenCalled()
	})

	it("signale qu'aucun utilisateur actif ne reste à ajouter", async () => {
		render(
			<DialogueMembre mode="ajout" projetId={3} candidats={[]} declencheur={<Button>Ouvrir</Button>} />,
		)
		await ouvrir()

		expect(screen.getByText("Aucun utilisateur actif à ajouter")).toBeInTheDocument()
	})
})

describe("DialogueMembre en modification", () => {
	beforeEach(() => {
		render(
			<DialogueMembre
				mode="modification"
				projetId={3}
				membre={{
					id: 5,
					version: 1,
					role: "MANAGER",
					utilisateur: { id: 7, libelle: "Léa Martin — lea@exemple.fr" },
				}}
				declencheur={<Button>Ouvrir</Button>}
			/>,
		)
	})

	it("affiche le membre et son rôle, puis enregistre avec la version lue", async () => {
		modifierSimule.mockResolvedValue({ statut: "succes" })
		await ouvrir()

		expect(screen.getByText("Léa Martin — lea@exemple.fr")).toBeInTheDocument()
		expect(screen.getByRole("combobox", { name: "Rôle" })).toHaveTextContent("Responsable")
		await enregistrer()

		expect(modifierSimule).toHaveBeenCalledWith(3, 5, { utilisateurId: 7, role: "MANAGER" }, 1)
		expect(toast.success).toHaveBeenCalledWith("Le rôle a été modifié.", { duration: 10_000 })
	})

	it("propose de recharger après une modification concurrente", async () => {
		modifierSimule.mockResolvedValue({ statut: "conflit", message: "Modifié entre-temps" })
		await ouvrir()

		await enregistrer()

		expect(await screen.findByText("Modifié entre-temps")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Recharger/ })).toBeInTheDocument()
	})
})
