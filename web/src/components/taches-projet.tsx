import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { DialogueTache } from "@/components/dialogue-tache"
import { PaginationListe } from "@/components/pagination-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerTaches } from "@/lib/api/taches"
import { supprimerTacheAction } from "@/lib/taches/actions"

type Props = Readonly<{
	projetId: number
	page: number
	/** Affiche la création, la modification et la suppression (l'API les réserve à l'administrateur). */
	estAdmin: boolean
}>

/** Tâches d'un projet, paginées (`?page=` de la fiche). Lit l'API : à placer dans un `<Suspense>`. */
export async function TachesProjet({ projetId, page, estAdmin }: Props) {
	const taches = await valeurOuErreurApi(listerTaches(projetId, page))
	if (taches instanceof ApiError) {
		return (
			<AlerteErreur
				titre="Impossible d'afficher les tâches"
				message={taches.message}
				identifiantCorrelation={taches.identifiantCorrelation}
			/>
		)
	}
	const colonnes = estAdmin ? 4 : 3

	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="border-b">
				<CardTitle>
					<h2>Tâches</h2>
				</CardTitle>
				{estAdmin && (
					<CardAction>
						<DialogueTache
							projetId={projetId}
							declencheur={
								<Button size="sm">
									<PlusIcon /> Nouvelle tâche
								</Button>
							}
						/>
					</CardAction>
				)}
			</CardHeader>
			<CardContent className="px-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-4">Libellé</TableHead>
							<TableHead className="hidden md:table-cell">Description</TableHead>
							<TableHead className={estAdmin ? undefined : "pr-4"}>Statut</TableHead>
							{estAdmin && (
								<TableHead className="pr-4 text-right">
									<span className="sr-only">Actions</span>
								</TableHead>
							)}
						</TableRow>
					</TableHeader>
					<TableBody>
						{taches.contenu.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={colonnes}
									className="py-8 text-center text-muted-foreground"
								>
									Aucune tâche.
								</TableCell>
							</TableRow>
						) : (
							taches.contenu.map((tache) => (
								<TableRow key={tache.id}>
									<TableCell className="pl-4 font-medium">{tache.libelle}</TableCell>
									<TableCell
										className="hidden max-w-md truncate text-muted-foreground md:table-cell"
										title={tache.description ?? undefined}
									>
										{tache.description}
									</TableCell>
									<TableCell className={estAdmin ? undefined : "pr-4"}>
										{tache.actif ? (
											<Badge variant="secondary">Active</Badge>
										) : (
											<Badge variant="outline">Inactive</Badge>
										)}
									</TableCell>
									{estAdmin && (
										<TableCell className="pr-4 text-right">
											<DialogueTache
												projetId={projetId}
												tache={{
													id: tache.id,
													version: tache.version,
													libelle: tache.libelle,
													description: tache.description,
													actif: tache.actif,
												}}
												declencheur={
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Modifier la tâche ${tache.libelle}`}
													>
														<PencilIcon />
													</Button>
												}
											/>
											<DialogueConfirmation
												titre="Supprimer la tâche ?"
												description={`La tâche « ${tache.libelle} » sera supprimée. Une tâche qui a des saisies de temps ne peut pas l'être : désactivez-la plutôt.`}
												libelleConfirmation="Supprimer"
												messageSucces="La tâche a été supprimée."
												action={supprimerTacheAction.bind(null, tache.id)}
												declencheur={
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Supprimer la tâche ${tache.libelle}`}
													>
														<Trash2Icon />
													</Button>
												}
											/>
										</TableCell>
									)}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				<div className="border-t p-4">
					<PaginationListe
						page={taches}
						chemin={`/projets/${projetId}`}
						libelle={taches.total > 1 ? "tâches" : "tâche"}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
