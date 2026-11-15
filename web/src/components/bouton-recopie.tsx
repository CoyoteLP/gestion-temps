"use client"

import { type MouseEvent, type ReactNode, useState, useTransition } from "react"
import { toast } from "sonner"

import { AlerteErreur } from "@/components/alerte-erreur"
import { Message } from "@/components/message"
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
import { Button } from "@/components/ui/button"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"
import { formaterJourLong } from "@/lib/format"
import type { CompteRenduRecopie } from "@/lib/saisies/compte-rendu"

type Props = Readonly<{
	/** Libellé du bouton (« Préremplir depuis la semaine précédente »). */
	libelle: string
	icone: ReactNode
	titre: string
	/** Explication affichée avant confirmation (nombre de saisies à créer…). */
	description: string
	/** Server Action de recopie, liée à la semaine par `bind`. */
	action: () => Promise<CompteRenduRecopie>
	/** Libellé de chaque tâche (« PJT001 · Dev »), pour le compte rendu des refus. */
	libellesTaches: Readonly<Record<string, string>>
}>

const pluriel = (nombre: number, mot: string) => `${nombre} ${mot}${nombre > 1 ? "s" : ""}`

/**
 * Bouton d'une recopie de saisies, avec confirmation puis compte rendu : les saisies acceptées sont
 * créées ; celles refusées par l'API (mois clôturé, tâche désactivée, 24 h…) sont listées avec leur
 * motif, sans empêcher les autres.
 */
export function BoutonRecopie({ libelle, icone, titre, description, action, libellesTaches }: Props) {
	const [ouvert, setOuvert] = useState(false)
	const [enCours, demarrer] = useTransition()
	const [compteRendu, setCompteRendu] = useState<CompteRenduRecopie | null>(null)

	function changerOuverture(valeur: boolean) {
		if (!enCours) {
			setOuvert(valeur)
			setCompteRendu(null)
		}
	}

	function confirmer(evenement: MouseEvent) {
		evenement.preventDefault()
		demarrer(async () => {
			const resultat = await action()
			if (resultat.statut === "succes" && resultat.refus.length === 0) {
				setOuvert(false)
				toast.success(
					`${pluriel(resultat.creees, "saisie")} ${resultat.creees > 1 ? "créées" : "créée"}.`,
					{
						duration: DUREE_MESSAGE_SUCCES_MS,
					},
				)
			} else {
				setCompteRendu(resultat)
			}
		})
	}

	const termine = compteRendu?.statut === "succes"
	return (
		<AlertDialog open={ouvert} onOpenChange={changerOuverture}>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm">
					{icone} {libelle}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{titre}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{compteRendu?.statut === "erreur" && (
					<AlerteErreur
						titre="Recopie impossible"
						message={compteRendu.message}
						identifiantCorrelation={compteRendu.identifiantCorrelation}
					/>
				)}
				{compteRendu?.statut === "succes" && (
					<div className="flex flex-col gap-2 text-sm" role="status">
						<Message niveau="avertissement">
							{pluriel(compteRendu.creees, "saisie")}{" "}
							{compteRendu.creees > 1 ? "créées" : "créée"},{" "}
							{pluriel(compteRendu.refus.length, "refus")} :
						</Message>
						<ul className="flex max-h-60 list-disc flex-col gap-1 overflow-y-auto pl-5">
							{compteRendu.refus.map((refus, index) => (
								<li key={`${refus.jour}-${refus.tacheId}-${index}`}>
									<span className="font-medium">
										{formaterJourLong(refus.jour)} —{" "}
										{libellesTaches[refus.tacheId] ?? `Tâche n° ${refus.tacheId}`}
									</span>{" "}
									: {refus.message}
								</li>
							))}
						</ul>
					</div>
				)}
				<AlertDialogFooter>
					{termine ? (
						<AlertDialogCancel>Fermer</AlertDialogCancel>
					) : (
						<>
							<AlertDialogCancel disabled={enCours}>Annuler</AlertDialogCancel>
							<AlertDialogAction onClick={confirmer} disabled={enCours} aria-busy={enCours}>
								{enCours ? "Recopie en cours…" : "Recopier"}
							</AlertDialogAction>
						</>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
