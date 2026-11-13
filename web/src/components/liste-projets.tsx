import { PencilIcon } from "lucide-react"
import Link from "next/link"

import { AlerteErreur } from "@/components/alerte-erreur"
import { PaginationListe } from "@/components/pagination-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerProjets } from "@/lib/api/projets"
import { formaterPeriode } from "@/lib/format"

type Props = Readonly<{
	/** Numéro de page, à partir de 1. */
	page: number
	/** Ajoute l'accès direct à la modification (l'API la réserve à l'administrateur). */
	estAdmin: boolean
}>

/**
 * Liste paginée des projets ; le nom ouvre la fiche du projet. Lit l'API : à placer dans un
 * `<Suspense>`.
 */
export async function ListeProjets({ page, estAdmin }: Props) {
	const projets = await valeurOuErreurApi(listerProjets(page))
	if (projets instanceof ApiError) {
		return (
			<AlerteErreur message={projets.message} identifiantCorrelation={projets.identifiantCorrelation} />
		)
	}
	const colonnes = estAdmin ? 5 : 4

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
								<TableHead className={estAdmin ? undefined : "pr-4"}>Statut</TableHead>
								{estAdmin && (
									<TableHead className="pr-4 text-right">
										<span className="sr-only">Actions</span>
									</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{projets.contenu.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={colonnes}
										className="py-8 text-center text-muted-foreground"
									>
										Aucun projet.
									</TableCell>
								</TableRow>
							) : (
								projets.contenu.map((projet) => (
									<TableRow key={projet.id}>
										<TableCell className="pl-4 font-mono text-sm">
											{projet.code}
										</TableCell>
										<TableCell className="font-medium">
											<Link
												href={`/projets/${projet.id}`}
												className="underline-offset-4 hover:underline"
											>
												{projet.nom}
											</Link>
										</TableCell>
										<TableCell className="hidden text-muted-foreground md:table-cell">
											{formaterPeriode(projet.dateDebut, projet.dateFin)}
										</TableCell>
										<TableCell className={estAdmin ? undefined : "pr-4"}>
											{projet.actif ? (
												<Badge variant="secondary">Actif</Badge>
											) : (
												<Badge variant="outline">Inactif</Badge>
											)}
										</TableCell>
										{estAdmin && (
											<TableCell className="pr-4 text-right">
												<Button variant="ghost" size="icon-sm" asChild>
													<Link
														href={`/projets/${projet.id}/modifier`}
														aria-label={`Modifier le projet ${projet.nom}`}
													>
														<PencilIcon />
													</Link>
												</Button>
											</TableCell>
										)}
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
