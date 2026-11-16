import { LockIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"

import { DialogueSaisie } from "@/components/dialogue-saisie"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { MAX_HEURES_JOUR, SEUIL_ALERTE_HEURES_JOUR } from "@/lib/constantes"
import { formaterDuree, formaterJourCourt, formaterJourLong } from "@/lib/format"
import type { Grille } from "@/lib/saisies/grille"
import type { OptionsSaisie } from "@/lib/saisies/options"

type Props = Readonly<{
	grille: Grille
	/** Jours affichés (lundi à vendredi, plus le week-end s'il a des saisies). */
	jours: readonly string[]
	dateDuJour: string
	/** Jours clôturés pour tous les projets de l'utilisateur. */
	joursClos: ReadonlySet<string>
	/** Options du dialogue de saisie ; absentes si l'utilisateur ne peut pas saisir. */
	options: OptionsSaisie | null
}>

/**
 * Grille de la semaine, en lecture : heures par tâche et par jour, cumul de chaque tâche, total de
 * chaque jour et de la semaine. Un « + » par jour ouvre la saisie sur ce jour.
 */
export function GrilleSemaine({ grille, jours, dateDuJour, joursClos, options }: Props) {
	return (
		<Card className="py-0">
			<CardContent className="px-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-4">Tâche</TableHead>
							{jours.map((jour) => {
								const clos = joursClos.has(jour)
								return (
									<TableHead
										key={jour}
										className={`text-right ${jour === dateDuJour ? "bg-muted/60" : ""} ${clos ? "text-muted-foreground" : ""}`}
										aria-current={jour === dateDuJour ? "date" : undefined}
										title={formaterJourLong(jour)}
									>
										<span className="inline-flex items-center gap-1">
											{clos && (
												<>
													<LockIcon className="size-3" aria-hidden="true" />
													<span className="sr-only">Mois clôturé : </span>
												</>
											)}
											{formaterJourCourt(jour)}
											{options && !clos && (
												<DialogueSaisie
													options={options}
													jourParDefaut={jour}
													declencheur={
														<Button
															variant="ghost"
															size="icon-xs"
															aria-label={`Ajouter une saisie le ${formaterJourLong(jour)}`}
														>
															<PlusIcon />
														</Button>
													}
												/>
											)}
										</span>
									</TableHead>
								)
							})}
							<TableHead className="pr-4 text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{grille.lignes.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={jours.length + 2}
									className="py-8 text-center text-muted-foreground"
								>
									Aucune saisie cette semaine.
								</TableCell>
							</TableRow>
						) : (
							grille.lignes.map((ligne) => (
								<TableRow key={ligne.tacheId}>
									<TableCell className="pl-4 font-medium">{ligne.libelle}</TableCell>
									{jours.map((jour) => (
										<TableCell
											key={jour}
											className={`text-right tabular-nums ${jour === dateDuJour ? "bg-muted/60" : ""}`}
										>
											{ligne.parJour[jour] ? formaterDuree(ligne.parJour[jour]) : ""}
										</TableCell>
									))}
									<TableCell className="pr-4 text-right font-medium tabular-nums">
										{formaterDuree(ligne.total)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell className="pl-4 font-medium">Total du jour</TableCell>
							{jours.map((jour) => {
								const total = grille.totauxParJour[jour] ?? 0
								const plein = total >= MAX_HEURES_JOUR
								const longue = !plein && total > SEUIL_ALERTE_HEURES_JOUR
								return (
									<TableCell
										key={jour}
										className={`text-right font-medium tabular-nums ${plein ? "text-destructive" : ""} ${longue ? "text-avertissement" : ""}`}
										title={
											longue
												? `Journée de plus de ${formaterDuree(SEUIL_ALERTE_HEURES_JOUR)}`
												: undefined
										}
									>
										{longue && (
											<TriangleAlertIcon
												className="mr-1 inline size-3"
												aria-hidden="true"
											/>
										)}
										{formaterDuree(total)}
										{plein && (
											<span className="sr-only"> (maximum de la journée atteint)</span>
										)}
										{longue && (
											<span className="sr-only">
												{" "}
												(plus de {formaterDuree(SEUIL_ALERTE_HEURES_JOUR)})
											</span>
										)}
									</TableCell>
								)
							})}
							<TableCell className="pr-4 text-right font-semibold tabular-nums">
								{formaterDuree(grille.totalSemaine)}
							</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</CardContent>
		</Card>
	)
}
