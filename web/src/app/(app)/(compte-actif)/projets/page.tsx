import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EnTetePage } from "@/components/en-tete-page"
import { ListeProjets } from "@/components/liste-projets"
import { ReserveAdmin } from "@/components/reserve-admin"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { utilisateurCourant } from "@/lib/auth/session"
import { lirePage } from "@/lib/pagination"

export const metadata: Metadata = { title: "Projets" }

export default function PageProjets({ searchParams }: PageProps<"/projets">) {
	return (
		<>
			<EnTetePage
				titre="Projets"
				description="Les projets sur lesquels le temps est saisi."
				actions={
					<Suspense fallback={null}>
						<ReserveAdmin>
							<Button asChild>
								<Link href="/projets/nouveau">
									<PlusIcon /> Nouveau projet
								</Link>
							</Button>
						</ReserveAdmin>
					</Suspense>
				}
			/>
			<Suspense fallback={<ChargementProjets />}>
				<Projets searchParams={searchParams} />
			</Suspense>
		</>
	)
}

/** Liste de la page demandée, avec l'accès à la modification pour l'administrateur. */
async function Projets({ searchParams }: Readonly<Pick<PageProps<"/projets">, "searchParams">>) {
	const [parametres, utilisateur] = await Promise.all([searchParams, utilisateurCourant()])
	return <ListeProjets page={lirePage(parametres.page)} estAdmin={utilisateur.estAdmin} />
}

function ChargementProjets() {
	return (
		<div className="flex flex-col gap-2" aria-busy="true" aria-label="Chargement des projets">
			{Array.from({ length: 5 }, (_, index) => (
				<Skeleton key={index} className="h-10 w-full" />
			))}
		</div>
	)
}
