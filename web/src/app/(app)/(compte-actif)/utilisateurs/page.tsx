import type { Metadata } from "next"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { ListeUtilisateurs } from "@/components/liste-utilisateurs"
import { Skeleton } from "@/components/ui/skeleton"
import { exigerAdmin } from "@/lib/auth/session"
import { lirePage } from "@/lib/pagination"
import { lireFiltreUtilisateurs } from "@/lib/utilisateurs/filtre"

export const metadata: Metadata = { title: "Utilisateurs" }

export default function PageUtilisateurs({ searchParams }: PageProps<"/utilisateurs">) {
	return (
		<>
			<EnTetePage
				titre="Utilisateurs"
				description="Validez les inscriptions et désactivez les comptes qui ne doivent plus accéder à l'application."
			/>
			<Suspense
				fallback={
					<div
						className="flex flex-col gap-2"
						aria-busy="true"
						aria-label="Chargement des utilisateurs"
					>
						{Array.from({ length: 5 }, (_, index) => (
							<Skeleton key={index} className="h-10 w-full" />
						))}
					</div>
				}
			>
				<Utilisateurs searchParams={searchParams} />
			</Suspense>
		</>
	)
}

/** Réservé à l'administrateur (les autres reçoivent la page « introuvable »). */
async function Utilisateurs({ searchParams }: Readonly<Pick<PageProps<"/utilisateurs">, "searchParams">>) {
	await exigerAdmin()
	const parametres = await searchParams
	return (
		<ListeUtilisateurs
			filtre={lireFiltreUtilisateurs(parametres.statut)}
			page={lirePage(parametres.page)}
		/>
	)
}
