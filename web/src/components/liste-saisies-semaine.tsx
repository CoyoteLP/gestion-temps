import { LockIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { DialogueSaisie } from "@/components/dialogue-saisie"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Saisie } from "@/lib/api/modeles"
import { formaterDuree, formaterJourCourt, formaterJourLong } from "@/lib/format"
import { supprimerSaisieAction } from "@/lib/saisies/actions"
import type { OptionsSaisie } from "@/lib/saisies/options"

type Props = Readonly<{
	saisies: readonly Saisie[]
	libelleTache: (tacheId: number) => string
	/** Vrai si la saisie est dans un mois clôturé pour son projet (lecture seule). */
	estClose: (saisie: Saisie) => boolean
	/** Options du dialogue de saisie ; absentes si l'utilisateur ne peut pas saisir. */
	options: OptionsSaisie | null
}>

/**
 * Saisies de la semaine, triées par jour puis par tâche : modifiables et supprimables, sauf dans un
 * mois clôturé. Liste bornée à la semaine : tableau simple, sans pagination, tri ni filtre.
 */
export function ListeSaisiesSemaine({ saisies, libelleTache, estClose, options }: Props) {
	const triees = [...saisies].sort(
		(a, b) =>
			a.jour.localeCompare(b.jour) ||
			libelleTache(a.tacheId).localeCompare(libelleTache(b.tacheId), "fr"),
	)
	return (
		<section className="flex flex-col gap-2" aria-labelledby="titre-saisies-semaine">
			<h2 id="titre-saisies-semaine" className="text-lg font-semibold">
				Saisies de la semaine
			</h2>
			<Card className="py-0">
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-4">Jour</TableHead>
								<TableHead>Tâche</TableHead>
								<TableHead className="text-right">Durée</TableHead>
								<TableHead className="hidden md:table-cell">Commentaire</TableHead>
								<TableHead className="pr-4 text-right">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{triees.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
										Aucune saisie cette semaine.
									</TableCell>
								</TableRow>
							) : (
								triees.map((saisie) => {
									const libelle = libelleTache(saisie.tacheId)
									const description = `${libelle} du ${formaterJourLong(saisie.jour)}`
									return (
										<TableRow key={saisie.id}>
											<TableCell className="pl-4" title={formaterJourLong(saisie.jour)}>
												{formaterJourCourt(saisie.jour)}
											</TableCell>
											<TableCell className="font-medium">{libelle}</TableCell>
											<TableCell className="text-right tabular-nums">
												{formaterDuree(saisie.duree)}
											</TableCell>
											<TableCell
												className="hidden max-w-xs truncate text-muted-foreground md:table-cell"
												title={saisie.commentaire ?? undefined}
											>
												{saisie.commentaire}
											</TableCell>
											<TableCell className="pr-4 text-right whitespace-nowrap">
												{estClose(saisie) ? (
													<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
														<LockIcon className="size-4" aria-hidden="true" />
														<span className="sr-only">
															Mois clôturé : saisie en lecture seule
														</span>
													</span>
												) : (
													options && (
														<>
															<DialogueSaisie
																options={options}
																saisie={saisie}
																jourParDefaut={saisie.jour}
																declencheur={
																	<Button
																		variant="ghost"
																		size="icon-sm"
																		aria-label={`Modifier la saisie ${description}`}
																	>
																		<PencilIcon />
																	</Button>
																}
															/>
															<DialogueConfirmation
																titre="Supprimer la saisie ?"
																description={`La saisie de ${formaterDuree(saisie.duree)} sur ${description} sera supprimée.`}
																libelleConfirmation="Supprimer"
																messageSucces="La saisie a été supprimée."
																action={supprimerSaisieAction.bind(
																	null,
																	saisie.id,
																)}
																declencheur={
																	<Button
																		variant="ghost"
																		size="icon-sm"
																		aria-label={`Supprimer la saisie ${description}`}
																	>
																		<Trash2Icon />
																	</Button>
																}
															/>
														</>
													)
												)}
											</TableCell>
										</TableRow>
									)
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</section>
	)
}
