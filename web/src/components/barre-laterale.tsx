"use client"

import { ClockIcon, FolderKanbanIcon, UserIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PAGE_ACCUEIL } from "@/lib/constantes"

const ENTREES = [
	{ titre: "Saisies", lien: "/saisies", icone: ClockIcon },
	{ titre: "Projets", lien: "/projets", icone: FolderKanbanIcon },
	{ titre: "Profil", lien: "/profil", icone: UserIcon },
]

/** Navigation principale de l'application ; l'entrée de la page courante est mise en évidence. */
export function BarreLaterale() {
	const chemin = usePathname()

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href={PAGE_ACCUEIL}>
								<span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
									<ClockIcon className="size-4" />
								</span>
								<span className="font-semibold">Gestion des temps</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{ENTREES.map((entree) => {
								const actif = chemin === entree.lien || chemin.startsWith(`${entree.lien}/`)
								return (
									<SidebarMenuItem key={entree.lien}>
										<SidebarMenuButton asChild isActive={actif} tooltip={entree.titre}>
											<Link
												href={entree.lien}
												aria-current={actif ? "page" : undefined}
											>
												<entree.icone />
												<span>{entree.titre}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	)
}
