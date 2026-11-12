"use client"

import { UserCheckIcon } from "lucide-react"
import { useActionState } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { Button } from "@/components/ui/button"
import { finaliserInscription } from "@/lib/compte/actions"
import { ETAT_INITIAL } from "@/lib/compte/etat-action"

/** Bouton qui crée la fiche de l'utilisateur connecté ; affiche le refus de l'API tel quel. */
export function FinaliserInscription() {
	const [etat, action, enCours] = useActionState(finaliserInscription, ETAT_INITIAL)

	return (
		<form action={action} className="flex flex-col gap-4">
			{etat.statut === "erreur" && (
				<AlerteErreur
					titre="Inscription impossible"
					message={etat.message}
					identifiantCorrelation={etat.identifiantCorrelation}
				/>
			)}
			<Button type="submit" className="w-fit" disabled={enCours} aria-busy={enCours}>
				<UserCheckIcon /> {enCours ? "Enregistrement…" : "Finaliser mon inscription"}
			</Button>
		</form>
	)
}
