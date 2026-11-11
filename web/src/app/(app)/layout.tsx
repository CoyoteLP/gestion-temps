import { Suspense } from "react"

import { BarreLaterale } from "@/components/barre-laterale"
import { ChoixTheme } from "@/components/choix-theme"
import { MenuUtilisateur } from "@/components/menu-utilisateur"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Coquille des pages authentifiées (le proxy garantit la session) : navigation, en-tête avec le
 * thème et le menu de l'utilisateur. Seul ce menu lit la session : le reste est rendu statiquement.
 */
export default function LayoutApplication({ children }: LayoutProps<"/">) {
	return (
		<SidebarProvider>
			<BarreLaterale />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" aria-label="Afficher ou masquer la navigation" />
					<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
					<div className="ml-auto flex items-center gap-1">
						<ChoixTheme />
						<Suspense fallback={<Skeleton className="h-8 w-32" />}>
							<MenuUtilisateur />
						</Suspense>
					</div>
				</header>
				<main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
