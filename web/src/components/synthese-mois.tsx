import { LockIcon, LockOpenIcon } from "lucide-react"
import Link from "next/link"

import { ClotureTousProjets } from "@/components/cloture-tous-projets"
import { DialogueCloture } from "@/components/dialogue-cloture"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { TableauListe } from "@/components/tableau-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import type { SyntheseMois as DonneesSynthese } from "@/lib/api/modeles"
import { cloturerMoisAction, rouvrirMoisAction } from "@/lib/clotures/actions"
import { estMoisTermine } from "@/lib/equipe/mois"
import { formaterDuree, formaterMois } from "@/lib/format"
import { LISTE_SYNTHESE } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"

type Props = Readonly<{
	/** Page de projets et total général des projets filtrés (calculés par l'API). */
	synthese: DonneesSynthese
	/** Mois affiché (`AAAA-MM`). */
	mois: string
	dateDuJour: string
	/** Paramètres de l'URL de la page (page et filtres de la synthèse : préfixe `synthese.`). */
	parametres: ParametresUrl
}>

/**
 * Synthèse du mois pour l'administrateur : chaque projet avec son statut (clôturé, ouvert) et son
 * total d'heures (filtrables par projet et par statut), le total général des projets filtrés, un
 * cadenas pour clôturer (mois terminé) ou rouvrir le mois du projet, et « Clôturer tous les projets
 * ouverts ». Le nom d'un projet ouvre son détail sur la page.
 */
export function SyntheseMois({ synthese, mois, dateDuJour, parametres }: Props) {
	const termine = estMoisTermine(mois, dateDuJour)
	const libelleMois = formaterMois(mois)
	return (
		<section className="flex flex-col gap-2" aria-labelledby="titre-synthese">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 id="titre-synthese" className="text-lg font-semibold">
					Synthèse des projets
				</h2>
				{termine && <ClotureTousProjets mois={mois} dateDuJour={dateDuJour} />}
			</div>
			<TableauListe
				definition={LISTE_SYNTHESE}
				etat={lireEtatListe(LISTE_SYNTHESE, parametres)}
				chemin="/equipe"
				parametres={parametres}
				page={synthese.projets}
				libelles={{ un: "projet", plusieurs: "projets" }}
				messages={{
					vide: "Aucun projet ce mois-ci.",
					aucunResultat: "Aucun projet ne correspond aux filtres.",
				}}
				pied={
					<TableRow>
						<TableCell colSpan={2} className="pl-4 font-medium">
							Total général
						</TableCell>
						<TableCell className="text-right font-semibold tabular-nums">
							{formaterDuree(synthese.totalHeures)}
						</TableCell>
						<TableCell />
					</TableRow>
				}
			>
				{synthese.projets.contenu.map((projet) => (
					<TableRow key={projet.projetId}>
						<TableCell className="pl-4">
							<Link
								href={`/equipe?projet=${projet.projetId}&mois=${mois}`}
								className="font-medium underline-offset-4 hover:underline"
							>
								{projet.code} · {projet.nom}
							</Link>
							{!projet.actif && (
								<Badge variant="outline" className="ml-2">
									Inactif
								</Badge>
							)}
						</TableCell>
						<TableCell>
							{projet.clotureId ? (
								<Badge variant="secondary">
									<LockIcon aria-hidden="true" /> Clôturé
								</Badge>
							) : (
								<Badge variant="outline">Ouvert</Badge>
							)}
						</TableCell>
						<TableCell
							className={`text-right tabular-nums ${projet.totalHeures === 0 ? "text-muted-foreground" : ""}`}
						>
							{formaterDuree(projet.totalHeures)}
						</TableCell>
						<TableCell className="pr-4 text-right whitespace-nowrap">
							{projet.clotureId ? (
								<DialogueConfirmation
									titre="Rouvrir ce mois ?"
									description={`Les saisies de ${libelleMois} pour le projet ${projet.code} redeviendront modifiables.`}
									libelleConfirmation="Rouvrir"
									messageSucces={`Mois rouvert : ${libelleMois}.`}
									action={rouvrirMoisAction.bind(null, projet.clotureId)}
									declencheur={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Rouvrir ${libelleMois} pour ${projet.code}`}
										>
											<LockOpenIcon />
										</Button>
									}
								/>
							) : (
								termine && (
									<DialogueCloture
										titre="Clôturer ce mois"
										description={`le projet ${projet.code}`}
										dateDuJour={dateDuJour}
										moisImpose={mois}
										action={cloturerMoisAction.bind(null, projet.projetId)}
										declencheur={
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Clôturer ${libelleMois} pour ${projet.code}`}
											>
												<LockIcon />
											</Button>
										}
									/>
								)
							)}
						</TableCell>
					</TableRow>
				))}
			</TableauListe>
		</section>
	)
}
