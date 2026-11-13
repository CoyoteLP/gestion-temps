"use client"

import { useRouter } from "next/navigation"
import { type MouseEvent, type ReactNode, useState, useTransition } from "react"
import { toast } from "sonner"

import { AlerteErreur } from "@/components/alerte-erreur"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { EtatAction } from "@/lib/actions/etat-action"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"

type Props = Readonly<{
	/** Bouton qui ouvre le dialogue. */
	declencheur: ReactNode
	titre: string
	description: ReactNode
	libelleConfirmation: string
	/** Server Action à exécuter (liée à sa ressource par `bind`). */
	action: () => Promise<EtatAction<never>>
	messageSucces: string
	/** Page ouverte après le succès ; sinon, la page courante (rafraîchie par l'action). */
	redirection?: string
}>

/**
 * Confirmation d'une opération irréversible (suppression, retrait, désactivation). Le dialogue reste
 * ouvert pendant l'opération ; un refus de l'API (ressource encore utilisée…) s'y affiche avec son
 * message.
 */
export function DialogueConfirmation({
	declencheur,
	titre,
	description,
	libelleConfirmation,
	action,
	messageSucces,
	redirection,
}: Props) {
	const router = useRouter()
	const [ouvert, setOuvert] = useState(false)
	const [enCours, demarrer] = useTransition()
	const [refus, setRefus] = useState<{ message: string; identifiantCorrelation?: string } | null>(null)

	function changerOuverture(valeur: boolean) {
		if (!enCours) {
			setOuvert(valeur)
			setRefus(null)
		}
	}

	function confirmer(evenement: MouseEvent) {
		// Le dialogue ne se ferme qu'après la réponse, pour afficher un éventuel refus
		evenement.preventDefault()
		demarrer(async () => {
			const resultat = await action()
			if (resultat.statut === "succes") {
				setOuvert(false)
				toast.success(messageSucces, { duration: DUREE_MESSAGE_SUCCES_MS })
				if (redirection) {
					router.push(redirection)
				}
			} else if (resultat.statut === "conflit") {
				setRefus({ message: resultat.message })
			} else if (resultat.statut === "erreur") {
				setRefus({
					message: resultat.message,
					identifiantCorrelation: resultat.identifiantCorrelation,
				})
			}
		})
	}

	return (
		<AlertDialog open={ouvert} onOpenChange={changerOuverture}>
			<AlertDialogTrigger asChild>{declencheur}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{titre}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{refus && (
					<AlerteErreur
						titre="Opération refusée"
						message={refus.message}
						identifiantCorrelation={refus.identifiantCorrelation}
					/>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={enCours}>Annuler</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={confirmer}
						disabled={enCours}
						aria-busy={enCours}
					>
						{enCours ? "En cours…" : libelleConfirmation}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
