import type { Metadata } from "next"
import { Suspense } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { EnTetePage } from "@/components/en-tete-page"
import { FormulaireProjet } from "@/components/formulaire-projet"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/erreurs"
import { exigerAdmin } from "@/lib/auth/session"
import { lireProjetDeLaPage } from "@/lib/projets/lecture"

export const metadata: Metadata = { title: "Modifier le projet" }

export default function PageModifierProjet({ params }: PageProps<"/projets/[id]/modifier">) {
	return (
		<>
			<EnTetePage titre="Modifier le projet" />
			<Suspense
				fallback={
					<div className="max-w-2xl" aria-busy="true" aria-label="Chargement du projet">
						<Skeleton className="h-96 w-full" />
					</div>
				}
			>
				<Modification params={params} />
			</Suspense>
		</>
	)
}

/** Réservé à l'administrateur ; le formulaire repart de la version lue (`key`). */
async function Modification({ params }: Readonly<Pick<PageProps<"/projets/[id]/modifier">, "params">>) {
	await exigerAdmin()
	const projet = await lireProjetDeLaPage((await params).id)
	if (projet instanceof ApiError) {
		return (
			<AlerteErreur message={projet.message} identifiantCorrelation={projet.identifiantCorrelation} />
		)
	}
	return (
		<Card className="max-w-2xl">
			<CardContent>
				<FormulaireProjet key={projet.version} projet={projet} />
			</CardContent>
		</Card>
	)
}
