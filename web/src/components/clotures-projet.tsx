import { LockIcon, LockOpenIcon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueCloture } from "@/components/dialogue-cloture"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { TableauListe } from "@/components/tableau-liste"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { listerCloturesDuProjet } from "@/lib/api/clotures"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import type { Projet } from "@/lib/api/modeles"
import { cloturerMoisAction, rouvrirMoisAction } from "@/lib/clotures/actions"
import { estResponsable } from "@/lib/equipe/recapitulatif"
import { formaterDate, formaterMois } from "@/lib/format"
import { listeClotures } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { aujourdhui } from "@/lib/saisies/semaine"

type Props = Readonly<{
	projet: Pick<Projet, "id" | "code" | "monRole">
	estAdmin: boolean
	/** Paramètres de l'URL de la fiche : page des clôtures (préfixe `clotures.`). */
	parametres: ParametresUrl
}>

/**
 * Mois clôturés d'un projet, visibles de tous ceux qui voient le projet. « Clôturer un mois » pour
 * l'administrateur, les responsables et suppléants ; « Rouvrir » pour l'administrateur. L'API
 * vérifie les droits. Lit l'API : à placer dans un `<Suspense>`.
 */
export async function CloturesProjet({ projet, estAdmin, parametres }: Props) {
	const definition = listeClotures(estAdmin)
	const etat = lireEtatListe(definition, parametres)
	const page = await valeurOuErreurApi(listerCloturesDuProjet(projet.id, etat.page))
	if (page instanceof ApiError) {
		return (
			<AlerteErreur
				titre="Impossible d'afficher les clôtures"
				message={page.message}
				identifiantCorrelation={page.identifiantCorrelation}
			/>
		)
	}
	const peutCloturer = estAdmin || estResponsable(projet.monRole)

	return (
		<section className="flex flex-col gap-2" aria-labelledby="titre-clotures">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h2 id="titre-clotures" className="text-lg font-semibold">
						Clôtures
					</h2>
					<p className="text-sm text-muted-foreground">
						Les saisies d&apos;un mois clôturé ne peuvent plus être créées, modifiées ni
						supprimées.
					</p>
				</div>
				{peutCloturer && (
					<DialogueCloture
						titre="Clôturer un mois"
						description={`le projet ${projet.code}`}
						dateDuJour={aujourdhui()}
						action={cloturerMoisAction.bind(null, projet.id)}
						declencheur={
							<Button size="sm">
								<LockIcon /> Clôturer un mois
							</Button>
						}
					/>
				)}
			</div>
			<TableauListe
				definition={definition}
				etat={etat}
				chemin={`/projets/${projet.id}`}
				parametres={parametres}
				page={page}
				libelles={{ un: "mois clôturé", plusieurs: "mois clôturés" }}
				messages={{ vide: "Aucun mois clôturé.", aucunResultat: "Aucun mois clôturé." }}
			>
				{page.contenu.map((cloture) => (
					<TableRow key={cloture.id}>
						<TableCell className="pl-4 font-medium first-letter:uppercase">
							{formaterMois(cloture.mois)}
						</TableCell>
						{estAdmin && (
							<TableCell className="hidden text-muted-foreground sm:table-cell">
								{cloture.audit &&
									`${formaterDate(cloture.audit.creeLe)} par ${cloture.audit.creePar}`}
							</TableCell>
						)}
						<TableCell className="pr-4 text-right whitespace-nowrap">
							{estAdmin && (
								<DialogueConfirmation
									titre="Rouvrir ce mois ?"
									description={`Les saisies de ${formaterMois(cloture.mois)} pour le projet ${projet.code} redeviendront modifiables.`}
									libelleConfirmation="Rouvrir"
									messageSucces={`Mois rouvert : ${formaterMois(cloture.mois)}.`}
									action={rouvrirMoisAction.bind(null, cloture.id)}
									declencheur={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Rouvrir ${formaterMois(cloture.mois)}`}
										>
											<LockOpenIcon />
										</Button>
									}
								/>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableauListe>
		</section>
	)
}
