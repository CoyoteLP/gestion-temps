import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import { creerTacheAction, modifierTacheAction } from "@/lib/taches/actions"

import { DialogueTache } from "./dialogue-tache"

vi.mock("@/lib/taches/actions", () => ({ creerTacheAction: vi.fn(), modifierTacheAction: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const creerSimule = vi.mocked(creerTacheAction)
const modifierSimule = vi.mocked(modifierTacheAction)

const tache = { id: 8, version: 2, libelle: "Recette", description: null, actif: true }

beforeEach(() => {
	creerSimule.mockReset()
	modifierSimule.mockReset()
	vi.mocked(toast.success).mockReset()
})

async function ouvrir(avecTache: boolean) {
	render(
		<DialogueTache
			projetId={3}
			tache={avecTache ? tache : undefined}
			declencheur={<Button>Ouvrir</Button>}
		/>,
	)
	await userEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
}

const enregistrer = () => userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

describe("DialogueTache", () => {
	it("crée une tâche dans le projet et ferme le dialogue", async () => {
		creerSimule.mockResolvedValue({ statut: "succes" })
		await ouvrir(false)

		await userEvent.type(screen.getByLabelText("Libellé"), "Développement")
		await enregistrer()

		expect(creerSimule).toHaveBeenCalledWith(3, {
			libelle: "Développement",
			description: "",
			actif: true,
		})
		expect(toast.success).toHaveBeenCalledWith("La tâche a été créée.", { duration: 10_000 })
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	it("refuse un libellé vide sans appeler le serveur", async () => {
		await ouvrir(false)

		await enregistrer()

		expect(await screen.findByText("Le libellé est obligatoire")).toBeInTheDocument()
		expect(creerSimule).not.toHaveBeenCalled()
	})

	it("modifie la tâche avec la version lue", async () => {
		modifierSimule.mockResolvedValue({ statut: "succes" })
		await ouvrir(true)

		expect(screen.getByRole("heading", { name: "Modifier la tâche" })).toBeInTheDocument()
		expect(screen.getByLabelText("Libellé")).toHaveValue("Recette")
		await userEvent.click(screen.getByRole("checkbox", { name: "Active" }))
		await enregistrer()

		expect(modifierSimule).toHaveBeenCalledWith(
			8,
			3,
			{ libelle: "Recette", description: "", actif: false },
			2,
		)
	})

	it("garde le dialogue ouvert et affiche le refus de l'API", async () => {
		creerSimule.mockResolvedValue({
			statut: "erreur",
			message: "Le projet est inactif",
			identifiantCorrelation: "id",
		})
		await ouvrir(false)

		await userEvent.type(screen.getByLabelText("Libellé"), "Développement")
		await enregistrer()

		expect(await screen.findByText("Le projet est inactif")).toBeInTheDocument()
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(toast.success).not.toHaveBeenCalled()
	})
})
