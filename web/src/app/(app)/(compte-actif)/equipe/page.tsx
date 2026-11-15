import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { Skeleton } from "@/components/ui/skeleton"
import { VueEquipe } from "@/components/vue-equipe"
import { utilisateurCourant } from "@/lib/auth/session"
import { lireMois } from "@/lib/equipe/mois"
import { aujourdhui } from "@/lib/saisies/semaine"

export const metadata: Metadata = { title: "Équipe" }

export default function PageEquipe({ searchParams }: PageProps<"/equipe">) {
	return (
		<>
			<EnTetePage
				titre="Équipe"
				description="Les saisies des membres de vos projets, mois par mois, et leur clôture."
			/>
			<Suspense
				fallback={
					<div className="flex flex-col gap-2" aria-busy="true" aria-label="Chargement de l'équipe">
						<Skeleton className="h-8 w-80" />
						<Skeleton className="h-48 w-full" />
					</div>
				}
			>
				<Equipe searchParams={searchParams} />
			</Suspense>
		</>
	)
}

/** Projet et mois demandés dans l'URL (`?projet=`, `?mois=`) ; le mois en cours à Paris par défaut. */
async function Equipe({ searchParams }: Readonly<Pick<PageProps<"/equipe">, "searchParams">>) {
	// La date du jour dépend de la requête : jamais figée au prérendu
	await connection()
	const dateDuJour = aujourdhui()
	const [parametres, utilisateur] = await Promise.all([searchParams, utilisateurCourant()])
	return (
		<VueEquipe
			mois={lireMois(parametres.mois, dateDuJour)}
			dateDuJour={dateDuJour}
			parametres={parametres}
			estAdmin={utilisateur.estAdmin}
		/>
	)
}
