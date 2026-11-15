import { LockIcon } from "lucide-react"

import { DialogueCloture } from "@/components/dialogue-cloture"
import { Button } from "@/components/ui/button"
import { cloturerTousLesProjetsAction } from "@/lib/clotures/actions"

type Props = Readonly<{
	/** Mois affiché (`AAAA-MM`, terminé). */
	mois: string
	/** Date du jour (`AAAA-MM-JJ`, Europe/Paris). */
	dateDuJour: string
}>

/**
 * « Clôturer tous les projets ouverts » pour le mois affiché (administrateur, synthèse de la page
 * Équipe) : clôture les projets actifs que leurs responsables n'ont pas encore clôturés.
 */
export function ClotureTousProjets({ mois, dateDuJour }: Props) {
	return (
		<DialogueCloture
			titre="Clôturer tous les projets ouverts"
			description="tous les projets actifs qui ne le sont pas encore"
			dateDuJour={dateDuJour}
			moisImpose={mois}
			action={cloturerTousLesProjetsAction}
			declencheur={
				<Button size="sm">
					<LockIcon /> Clôturer tous les projets ouverts
				</Button>
			}
		/>
	)
}
