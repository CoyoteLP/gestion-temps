import { Suspense } from "react"

import { GardeCompte } from "@/components/garde-compte"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Pages qui appellent l'API : réservées à un administrateur ou à un utilisateur dont la fiche est
 * active (sinon l'API répond 403). Un compte en attente voit à la place l'état de son inscription.
 * Toute nouvelle page qui lit l'API se place dans ce groupe ; le Profil reste en dehors.
 */
export default function LayoutCompteActif({ children }: LayoutProps<"/">) {
	return (
		<Suspense
			fallback={
				<div className="flex flex-col gap-2" aria-busy="true" aria-label="Vérification du compte">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-40 w-full" />
				</div>
			}
		>
			<GardeCompte>{children}</GardeCompte>
		</Suspense>
	)
}
