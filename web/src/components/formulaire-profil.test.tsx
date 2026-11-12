import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { modifierProfil } from "@/lib/compte/actions"

import { FormulaireProfil } from "./formulaire-profil"

const rafraichir = vi.fn()

vi.mock("@/lib/compte/actions", () => ({ modifierProfil: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: rafraichir }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const actionSimulee = vi.mocked(modifierProfil)

beforeEach(() => {
	actionSimulee.mockReset()
	rafraichir.mockReset()
	vi.mocked(toast.success).mockReset()
	render(<FormulaireProfil nom="Dupont" prenom="Jean" version={3} />)
})

async function remplacer(libelle: string, valeur: string) {
	const champ = screen.getByLabelText(libelle)
	await userEvent.clear(champ)
	if (valeur) {
		await userEvent.type(champ, valeur)
	}
}

const enregistrer = () => userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }))

describe("FormulaireProfil", () => {
	it("affiche le nom et le prénom actuels", () => {
		expect(screen.getByLabelText("Prénom")).toHaveValue("Jean")
		expect(screen.getByLabelText("Nom")).toHaveValue("Dupont")
	})

	it("enregistre le profil avec la version lue et le confirme pendant 10 secondes", async () => {
		actionSimulee.mockResolvedValue({ statut: "succes" })

		await remplacer("Nom", "Durand")
		await enregistrer()

		expect(actionSimulee).toHaveBeenCalledWith({ nom: "Durand", prenom: "Jean" }, 3)
		expect(toast.success).toHaveBeenCalledWith("Les modifications ont été correctement réalisées.", {
			duration: 10_000,
		})
	})

	it("refuse un champ vide sans appeler le serveur", async () => {
		await remplacer("Prénom", "")
		await enregistrer()

		expect(await screen.findByText("Le prénom est obligatoire")).toBeInTheDocument()
		expect(screen.getByLabelText("Prénom")).toHaveAttribute("aria-invalid", "true")
		expect(actionSimulee).not.toHaveBeenCalled()
	})

	it("affiche sous le champ une erreur renvoyée par le serveur", async () => {
		actionSimulee.mockResolvedValue({
			statut: "invalide",
			erreurs: { nom: "Le nom est obligatoire" },
		})

		await enregistrer()

		expect(await screen.findByText("Le nom est obligatoire")).toBeInTheDocument()
	})

	it("propose de recharger après une modification concurrente", async () => {
		actionSimulee.mockResolvedValue({ statut: "conflit", message: "La ressource a été modifiée" })

		await enregistrer()
		await userEvent.click(await screen.findByRole("button", { name: /Recharger/ }))

		expect(screen.getByText("La ressource a été modifiée")).toBeInTheDocument()
		expect(rafraichir).toHaveBeenCalled()
		expect(toast.success).not.toHaveBeenCalled()
	})

	it("affiche une autre erreur de l'API avec sa référence", async () => {
		actionSimulee.mockResolvedValue({
			statut: "erreur",
			message: "Le service est momentanément indisponible",
			identifiantCorrelation: "id-503",
		})

		await enregistrer()

		const alerte = await screen.findByRole("alert")
		expect(alerte).toHaveTextContent("Enregistrement impossible")
		expect(alerte).toHaveTextContent("id-503")
	})
})
