import type { Metadata } from "next"
import { Suspense } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { EnTetePage } from "@/components/en-tete-page"
import { PaginationListe } from "@/components/pagination-liste"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError } from "@/lib/api/erreurs"
import type { Projet } from "@/lib/api/modeles"
import { listerProjets } from "@/lib/api/projets"
import type { PageResponse } from "@/lib/api/types"
import { formaterPeriode } from "@/lib/format"
import { lirePage } from "@/lib/pagination"

export const metadata: Metadata = { title: "Projets" }

export default function PageProjets({ searchParams }: PageProps<"/projets">) {
	return (
		<>
			<EnTetePage titre="Projets" description="Les projets sur lesquels le temps est saisi." />
			<Suspense fallback={<ChargementProjets />}>
				<ListeProjets searchParams={searchParams} />
			</Suspense>
		</>
	)
}

async function ListeProjets({ searchParams }: Readonly<Pick<PageProps<"/projets">, "searchParams">>) {
	const page = lirePage((await searchParams).page)
	let projets: PageResponse<Projet>
	try {
		projets = await listerProjets(page)
	} catch (erreur) {
		if (erreur instanceof ApiError) {
			return (
				<AlerteErreur
					message={erreur.message}
					identifiantCorrelation={erreur.identifiantCorrelation}
				/>
			)
		}
		throw erreur
	}

	return (
		<>
			<Card className="py-0">
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-4">Code</TableHead>
								<TableHead>Nom</TableHead>
								<TableHead className="hidden md:table-cell">Période</TableHead>
								<TableHead className="pr-4">Statut</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{projets.contenu.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
										Aucun projet.
									</TableCell>
								</TableRow>
							) : (
								projets.contenu.map((projet) => (
									<TableRow key={projet.id}>
										<TableCell className="pl-4 font-mono text-sm">
											{projet.code}
										</TableCell>
										<TableCell className="font-medium">{projet.nom}</TableCell>
										<TableCell className="hidden text-muted-foreground md:table-cell">
											{formaterPeriode(projet.dateDebut, projet.dateFin)}
										</TableCell>
										<TableCell className="pr-4">
											{projet.actif ? (
												<Badge variant="secondary">Actif</Badge>
											) : (
												<Badge variant="outline">Inactif</Badge>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<PaginationListe
				page={projets}
				chemin="/projets"
				libelle={projets.total > 1 ? "projets" : "projet"}
			/>
		</>
	)
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
