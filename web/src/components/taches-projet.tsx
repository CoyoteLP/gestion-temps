import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { DialogueTache } from "@/components/dialogue-tache"
import { TableauListe } from "@/components/tableau-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerTaches } from "@/lib/api/taches"
import { LISTE_TACHES } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { supprimerTacheAction } from "@/lib/taches/actions"

type Props = Readonly<{
	projetId: number
	/** Paramètres de l'URL de la fiche : page, tri et filtres des tâches (sans préfixe). */
	parametres: ParametresUrl
	/** Affiche la création, la modification et la suppression (l'API les réserve à l'administrateur). */
	estAdmin: boolean
}>

/**
 * Tâches d'un projet, paginées, triables et filtrables. Lit l'API : à placer dans un `<Suspense>`.
 */
export async function TachesProjet({ projetId, parametres, estAdmin }: Props) {
	const etat = lireEtatListe(LISTE_TACHES, parametres)
	const taches = await valeurOuErreurApi(listerTaches(projetId, etat))
	if (taches instanceof ApiError) {
		return (
			<AlerteErreur
				titre="Impossible d'afficher les tâches"
				message={taches.message}
				identifiantCorrelation={taches.identifiantCorrelation}
			/>
		)
	}

	return (
		<section className="flex flex-col gap-2" aria-labelledby="titre-taches">
			<div className="flex items-center justify-between gap-2">
				<h2 id="titre-taches" className="text-lg font-semibold">
					Tâches
				</h2>
				{estAdmin && (
					<DialogueTache
						projetId={projetId}
						declencheur={
							<Button size="sm">
								<PlusIcon /> Nouvelle tâche
							</Button>
						}
					/>
				)}
			</div>
			<TableauListe
				definition={LISTE_TACHES}
				etat={etat}
				chemin={`/projets/${projetId}`}
				parametres={parametres}
				page={taches}
				libelles={{ un: "tâche", plusieurs: "tâches" }}
				messages={{ vide: "Aucune tâche.", aucunResultat: "Aucune tâche ne correspond aux filtres." }}
			>
				{taches.contenu.map((tache) => (
					<TableRow key={tache.id}>
						<TableCell className="pl-4 font-medium">{tache.libelle}</TableCell>
						<TableCell
							className="hidden max-w-md truncate text-muted-foreground md:table-cell"
							title={tache.description ?? undefined}
						>
							{tache.description}
						</TableCell>
						<TableCell>
							{tache.actif ? (
								<Badge variant="secondary">Active</Badge>
							) : (
								<Badge variant="outline">Inactive</Badge>
							)}
						</TableCell>
						<TableCell className="pr-4 text-right whitespace-nowrap">
							{estAdmin && (
								<>
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
								</>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableauListe>
		</section>
	)
}
