import type { Metadata } from "next"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { utilisateurCourant } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Profil" }

export default function PageProfil() {
	return (
		<>
			<EnTetePage titre="Profil" description="Vos informations de connexion." />
			<Card className="max-w-lg">
				<CardHeader>
					<CardTitle>Identité</CardTitle>
					<CardDescription>
						Lue dans votre compte de connexion. La modification de vos informations arrive
						prochainement.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<Skeleton className="h-20 w-full" />}>
						<Identite />
					</Suspense>
				</CardContent>
			</Card>
		</>
	)
}

async function Identite() {
	const utilisateur = await utilisateurCourant()
	return (
		<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
			<dt className="text-muted-foreground">Nom</dt>
			<dd>{utilisateur.nom}</dd>
			<dt className="text-muted-foreground">Email</dt>
			<dd>{utilisateur.email}</dd>
			<dt className="text-muted-foreground">Rôle</dt>
			<dd>{utilisateur.estAdmin ? "Administrateur" : "Collaborateur"}</dd>
		</dl>
	)
}
