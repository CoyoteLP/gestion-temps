import { LockIcon, LockOpenIcon } from "lucide-react"

import { DialogueCloture } from "@/components/dialogue-cloture"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Cloture, Projet } from "@/lib/api/modeles"
import { cloturerMoisAction, rouvrirMoisAction } from "@/lib/clotures/actions"
import { estMoisTermine } from "@/lib/equipe/mois"
import { estResponsable } from "@/lib/equipe/recapitulatif"
import { formaterMois } from "@/lib/format"

type Props = Readonly<{
	projet: Pick<Projet, "id" | "code" | "monRole">
	/** Mois affiché (`AAAA-MM`). */
	mois: string
	/** Clôture du mois pour ce projet, ou null s'il est ouvert. */
	cloture: Cloture | null
	dateDuJour: string
	estAdmin: boolean
}>

/**
 * Statut du mois pour le projet (ouvert, clôturé) et l'action possible : « Clôturer ce mois » pour
 * un mois terminé (administrateur, responsable, suppléant), « Rouvrir » pour l'administrateur.
 */
export function StatutMois({ projet, mois, cloture, dateDuJour, estAdmin }: Props) {
	const libelle = formaterMois(mois)
	const peutCloturer = estAdmin || estResponsable(projet.monRole)
	return (
		<div className="flex flex-wrap items-center gap-2">
			{cloture ? (
				<Badge variant="secondary">
					<LockIcon aria-hidden="true" /> Clôturé
				</Badge>
			) : (
				<Badge variant="outline">Ouvert</Badge>
			)}
			{!cloture && peutCloturer && estMoisTermine(mois, dateDuJour) && (
				<DialogueCloture
					titre="Clôturer ce mois"
					description={`le projet ${projet.code}`}
					dateDuJour={dateDuJour}
					moisImpose={mois}
					action={cloturerMoisAction.bind(null, projet.id)}
					declencheur={
						<Button size="sm">
							<LockIcon /> Clôturer ce mois
						</Button>
					}
				/>
			)}
			{cloture && estAdmin && (
				<DialogueConfirmation
					titre="Rouvrir ce mois ?"
					description={`Les saisies de ${libelle} pour le projet ${projet.code} redeviendront modifiables.`}
					libelleConfirmation="Rouvrir"
					messageSucces={`Mois rouvert : ${libelle}.`}
					action={rouvrirMoisAction.bind(null, cloture.id)}
					declencheur={
						<Button variant="outline" size="sm">
							<LockOpenIcon /> Rouvrir
						</Button>
					}
				/>
			)}
		</div>
	)
}
