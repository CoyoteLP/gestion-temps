import { LogOutIcon, UserIcon } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { seDeconnecter } from "@/lib/auth/actions"
import { utilisateurCourant } from "@/lib/auth/session"
import { initiales } from "@/lib/format"

/** Menu de l'utilisateur connecté (lit la session : à placer dans un `<Suspense>`). */
export async function MenuUtilisateur() {
	const utilisateur = await utilisateurCourant()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="gap-2 px-2" aria-label={`Menu de ${utilisateur.nom}`}>
					<Avatar className="size-7">
						<AvatarFallback>{initiales(utilisateur.nom)}</AvatarFallback>
					</Avatar>
					<span className="hidden sm:inline">{utilisateur.nom}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuLabel className="flex flex-col gap-1">
					<span>{utilisateur.nom}</span>
					<span className="text-xs font-normal text-muted-foreground">{utilisateur.email}</span>
					{utilisateur.estAdmin && (
						<Badge variant="secondary" className="w-fit">
							Administrateur
						</Badge>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/profil">
						<UserIcon /> Mon profil
					</Link>
				</DropdownMenuItem>
				<form action={seDeconnecter}>
					<DropdownMenuItem asChild>
						<button type="submit" className="w-full">
							<LogOutIcon /> Se déconnecter
						</button>
					</DropdownMenuItem>
				</form>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
