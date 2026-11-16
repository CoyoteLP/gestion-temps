import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { SemaineSaisies } from "@/components/semaine-saisies"
import { Skeleton } from "@/components/ui/skeleton"
import { aujourdhui, lireSemaine } from "@/lib/saisies/semaine"

export const metadata: Metadata = { title: "Saisies" }

export default function PageSaisies({ searchParams }: PageProps<"/saisies">) {
	return (
		<>
			<EnTetePage titre="Saisies" description="Votre temps, semaine par semaine." />
			<Suspense
				fallback={
					<div
						className="flex flex-col gap-2"
						aria-busy="true"
						aria-label="Chargement de la semaine"
					>
						<Skeleton className="h-8 w-80" />
						<Skeleton className="h-48 w-full" />
					</div>
				}
			>
				<Semaine searchParams={searchParams} />
			</Suspense>
		</>
	)
}

/** Semaine demandée dans l'URL (`?semaine=`, le lundi), la semaine en cours à Paris sinon. */
async function Semaine({ searchParams }: Readonly<Pick<PageProps<"/saisies">, "searchParams">>) {
	// La date du jour dépend de la requête : jamais figée au prérendu
	await connection()
	const dateDuJour = aujourdhui()
	const semaine = lireSemaine((await searchParams).semaine, dateDuJour)
	return <SemaineSaisies semaine={semaine} dateDuJour={dateDuJour} />
}
