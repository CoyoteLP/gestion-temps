"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode, Suspense } from "react"

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

type Props = Readonly<{
	titre: string
	lien: string
	icone: ReactNode
}>

/**
 * Entrée de la barre latérale, mise en évidence sur sa page et ses sous-pages. Sous une route à
 * paramètre dynamique (`/projets/[id]`), le chemin n'est connu qu'à la requête (Cache Components) :
 * l'entrée est prérendue sans mise en évidence, puis complétée.
 */
export function EntreeNavigation(props: Props) {
	return (
		<Suspense fallback={<LienNavigation {...props} actif={false} />}>
			<EntreeSelonChemin {...props} />
		</Suspense>
	)
}

function EntreeSelonChemin(props: Props) {
	const chemin = usePathname()
	const actif = chemin === props.lien || chemin.startsWith(`${props.lien}/`)
	return <LienNavigation {...props} actif={actif} />
}

function LienNavigation({ titre, lien, icone, actif }: Props & Readonly<{ actif: boolean }>) {
	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={actif} tooltip={titre}>
				<Link href={lien} aria-current={actif ? "page" : undefined}>
					{icone}
					<span>{titre}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)
}
