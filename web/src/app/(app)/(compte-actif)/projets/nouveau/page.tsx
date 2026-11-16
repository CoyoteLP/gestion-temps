import type { Metadata } from "next"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { FormulaireProjet } from "@/components/formulaire-projet"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { exigerAdmin } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Nouveau projet" }

export default function PageNouveauProjet() {
	return (
		<>
			<EnTetePage titre="Nouveau projet" />
			<Suspense
				fallback={
					<div className="max-w-2xl" aria-busy="true" aria-label="Chargement du formulaire">
						<Skeleton className="h-96 w-full" />
					</div>
				}
			>
				<Creation />
			</Suspense>
		</>
	)
}

/** Réservé à l'administrateur (les autres reçoivent la page « introuvable »). */
async function Creation() {
	await exigerAdmin()
	return (
		<Card className="max-w-2xl">
			<CardContent>
				<FormulaireProjet />
			</CardContent>
		</Card>
	)
}
