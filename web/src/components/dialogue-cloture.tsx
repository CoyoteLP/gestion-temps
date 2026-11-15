"use client"

import { type FormEvent, type ReactNode, useState, useTransition } from "react"
import { toast } from "sonner"

import { AlerteErreur } from "@/components/alerte-erreur"
import { Message } from "@/components/message"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"
import { type EtatCloture, schemaCloture } from "@/lib/clotures/schema-cloture"
import { decalerMois } from "@/lib/equipe/mois"
import { formaterMois } from "@/lib/format"
import { moisDe } from "@/lib/saisies/semaine"

type Props = Readonly<{
	/** Bouton qui ouvre le dialogue. */
	declencheur: ReactNode
	titre: string
	/** Ce qui sera clôturé (« le projet PJT001 », « tous les projets actifs »). */
	description: string
	/** Date du jour (`AAAA-MM-JJ`, Europe/Paris) : seul un mois terminé se clôture. */
	dateDuJour: string
	/** Mois imposé (page Équipe) ; sans lui, le mois se choisit, le précédent par défaut. */
	moisImpose?: string
	/** Server Action liée à son projet (`bind`), appelée avec le mois choisi. */
	action: (mois: string) => Promise<EtatCloture>
}>

/**
 * Clôture d'un mois, après confirmation : choix du mois (ou mois imposé), rappel de ses effets. Un
 * mois en cours ou à venir est signalé avant l'envoi (l'API le refuserait) ; un refus de l'API (mois
 * déjà clôturé, droits) s'affiche sans fermer le dialogue.
 */
export function DialogueCloture({ declencheur, titre, description, dateDuJour, moisImpose, action }: Props) {
	const moisMax = decalerMois(moisDe(dateDuJour), -1)
	const moisInitial = moisImpose ?? moisMax
	const [ouvert, setOuvert] = useState(false)
	const [mois, setMois] = useState(moisInitial)
	const [erreurMois, setErreurMois] = useState<string | null>(null)
	const [refus, setRefus] = useState<{ message: string; identifiantCorrelation?: string } | null>(null)
	const [enCours, demarrer] = useTransition()
	const schema = schemaCloture(dateDuJour)

	function changerOuverture(valeur: boolean) {
		if (enCours) {
			return
		}
		if (valeur) {
			setMois(moisInitial)
			setErreurMois(null)
			setRefus(null)
		}
		setOuvert(valeur)
	}

	function erreurDe(valeur: string): string | null {
		const resultat = schema.safeParse({ mois: valeur })
		return resultat.success ? null : (resultat.error.issues[0]?.message ?? null)
	}

	function changerMois(valeur: string) {
		setMois(valeur)
		setErreurMois(erreurDe(valeur))
	}

	function confirmer(evenement: FormEvent) {
		evenement.preventDefault()
		const erreur = erreurDe(mois)
		if (erreur) {
			setErreurMois(erreur)
			return
		}
		demarrer(async () => {
			const resultat = await action(mois)
			if (resultat.statut === "succes") {
				setOuvert(false)
				toast.success("message" in resultat ? resultat.message : "Mois clôturé.", {
					duration: DUREE_MESSAGE_SUCCES_MS,
				})
			} else if (resultat.statut === "invalide") {
				setErreurMois(resultat.erreurs.mois ?? null)
			} else if (resultat.statut === "erreur" || resultat.statut === "conflit") {
				setRefus({
					message: resultat.message,
					identifiantCorrelation:
						resultat.statut === "erreur" ? resultat.identifiantCorrelation : undefined,
				})
			}
		})
	}

	return (
		<Dialog open={ouvert} onOpenChange={changerOuverture}>
			<DialogTrigger asChild>{declencheur}</DialogTrigger>
			<DialogContent>
				<form onSubmit={confirmer} noValidate className="flex flex-col gap-4">
					<DialogHeader>
						<DialogTitle>{titre}</DialogTitle>
						<DialogDescription>
							{moisImpose
								? `Clôture pour ${description} — ${formaterMois(moisImpose)}.`
								: `Clôture d'un mois terminé pour ${description}.`}
						</DialogDescription>
					</DialogHeader>
					{refus && (
						<AlerteErreur
							titre="Clôture impossible"
							message={refus.message}
							identifiantCorrelation={refus.identifiantCorrelation}
						/>
					)}
					{moisImpose ? (
						erreurMois && <Message niveau="erreur">{erreurMois}</Message>
					) : (
						<Field data-invalid={Boolean(erreurMois)}>
							<FieldLabel htmlFor="mois-cloture">Mois</FieldLabel>
							<Input
								id="mois-cloture"
								type="month"
								max={moisMax}
								value={mois}
								aria-invalid={Boolean(erreurMois)}
								onChange={(evenement) => changerMois(evenement.target.value)}
							/>
							<FieldError errors={erreurMois ? [{ message: erreurMois }] : []} />
						</Field>
					)}
					<Message niveau="avertissement">
						Les saisies de ce mois ne pourront plus être créées, modifiées ni supprimées. Seul un
						administrateur peut rouvrir un mois.
					</Message>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={enCours}>
								Annuler
							</Button>
						</DialogClose>
						<Button type="submit" disabled={enCours} aria-busy={enCours}>
							{enCours ? "Clôture…" : "Clôturer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
