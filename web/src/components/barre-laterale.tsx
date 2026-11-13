import { ClockIcon, FolderKanbanIcon, UserIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { EntreeNavigation } from "@/components/entree-navigation"
import { ReserveAdmin } from "@/components/reserve-admin"
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

/**
 * Navigation principale de l'application ; l'entrée de la page courante est mise en évidence.
 * L'entrée « Utilisateurs » n'apparaît qu'à l'administrateur (seule partie qui lit la session).
 */
export function BarreLaterale() {
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
							<EntreeNavigation titre="Saisies" lien="/saisies" icone={<ClockIcon />} />
							<EntreeNavigation titre="Projets" lien="/projets" icone={<FolderKanbanIcon />} />
							<Suspense fallback={null}>
								<ReserveAdmin>
									<EntreeNavigation
										titre="Utilisateurs"
										lien="/utilisateurs"
										icone={<UsersIcon />}
									/>
								</ReserveAdmin>
							</Suspense>
							<EntreeNavigation titre="Profil" lien="/profil" icone={<UserIcon />} />
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	)
}
