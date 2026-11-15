import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Encadre, Message } from "./message"

describe("Message", () => {
	it.each([
		["information", "text-information"],
		["avertissement", "text-avertissement"],
		["erreur", "text-destructive"],
	] as const)("colore un message de niveau %s", (niveau, classe) => {
		render(<Message niveau={niveau}>Texte du message</Message>)

		expect(screen.getByText("Texte du message").parentElement).toHaveClass(classe)
	})

	it("porte le rôle demandé, et aucun par défaut", () => {
		render(
			<>
				<Message niveau="avertissement" role="status">
					Avec rôle
				</Message>
				<Message niveau="information">Sans rôle</Message>
			</>,
		)

		expect(screen.getByRole("status")).toHaveTextContent("Avec rôle")
		expect(screen.getByText("Sans rôle").parentElement).not.toHaveAttribute("role")
	})
})

describe("Encadre", () => {
	it("affiche le titre et le texte d'une information, en bleu", () => {
		render(
			<Encadre niveau="information" titre="Aucun projet">
				Demandez à un administrateur.
			</Encadre>,
		)

		const encadre = screen.getByRole("alert")
		expect(encadre).toHaveTextContent("Aucun projet")
		expect(encadre).toHaveTextContent("Demandez à un administrateur.")
		expect(encadre).toHaveClass("text-information")
		expect(encadre).not.toHaveClass("text-destructive")
	})
})
