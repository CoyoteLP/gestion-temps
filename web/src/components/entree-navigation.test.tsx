import { render, screen } from "@testing-library/react"
import { usePathname } from "next/navigation"
import { describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { EntreeNavigation } from "./entree-navigation"

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }))

function afficher(chemin: string) {
	vi.mocked(usePathname).mockReturnValue(chemin)
	render(
		<TooltipProvider>
			<SidebarProvider>
				<EntreeNavigation titre="Projets" lien="/projets" icone={null} />
			</SidebarProvider>
		</TooltipProvider>,
	)
}

describe("EntreeNavigation", () => {
	it.each(["/projets", "/projets/12/modifier"])("signale la page courante (%s)", (chemin) => {
		afficher(chemin)

		expect(screen.getByRole("link", { name: "Projets" })).toHaveAttribute("aria-current", "page")
	})

	it.each(["/profil", "/projets-archives"])("ne signale pas une autre page (%s)", (chemin) => {
		afficher(chemin)

		expect(screen.getByRole("link", { name: "Projets" })).not.toHaveAttribute("aria-current")
	})
})
