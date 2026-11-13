"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type ReactNode, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { AlerteConflit } from "@/components/alerte-conflit"
import { AlerteErreur } from "@/components/alerte-erreur"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/etat-action"
import type { Tache } from "@/lib/api/modeles"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"
import { creerTacheAction, modifierTacheAction } from "@/lib/taches/actions"
import { schemaTache, type ValeursTache, valeursDeLaTache } from "@/lib/taches/schema-tache"

type Props = Readonly<{
	projetId: number
	/** Tâche à modifier ; absente pour une création. */
	tache?: Pick<Tache, "id" | "version" | "libelle" | "description" | "actif">
	/** Bouton qui ouvre le dialogue. */
	declencheur: ReactNode
}>

/** Création ou modification d'une tâche d'un projet (administrateur), dans un dialogue. */
export function DialogueTache({ projetId, tache, declencheur }: Props) {
	const [ouvert, setOuvert] = useState(false)
	const [enCours, demarrer] = useTransition()
	const [etat, setEtat] = useState<EtatAction<keyof ValeursTache>>(ETAT_INITIAL)
	const formulaire = useForm<ValeursTache>({
		resolver: zodResolver(schemaTache),
		defaultValues: valeursDeLaTache(tache),
	})

	function changerOuverture(valeur: boolean) {
		if (enCours) {
			return
		}
		if (valeur) {
			// Chaque ouverture repart des valeurs actuelles de la tâche
			formulaire.reset(valeursDeLaTache(tache))
			setEtat(ETAT_INITIAL)
		}
		setOuvert(valeur)
	}

	function enregistrer(valeurs: ValeursTache) {
		demarrer(async () => {
			const resultat = tache
				? await modifierTacheAction(tache.id, projetId, valeurs, tache.version)
				: await creerTacheAction(projetId, valeurs)
			if (resultat.statut === "invalide") {
				for (const [champ, message] of Object.entries(resultat.erreurs)) {
					formulaire.setError(champ as keyof ValeursTache, { message })
				}
			} else if (resultat.statut === "succes") {
				toast.success(tache ? "La tâche a été modifiée." : "La tâche a été créée.", {
					duration: DUREE_MESSAGE_SUCCES_MS,
				})
				setOuvert(false)
			}
			setEtat(resultat)
		})
	}

	const erreurs = formulaire.formState.errors
	return (
		<Dialog open={ouvert} onOpenChange={changerOuverture}>
			<DialogTrigger asChild>{declencheur}</DialogTrigger>
			<DialogContent>
				<form
					onSubmit={formulaire.handleSubmit(enregistrer)}
					noValidate
					className="flex flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle>{tache ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
						<DialogDescription>
							Les collaborateurs saisissent leur temps sur les tâches actives.
						</DialogDescription>
					</DialogHeader>
					{etat.statut === "conflit" && (
						<AlerteConflit titre="Tâche modifiée entre-temps" message={etat.message} />
					)}
					{etat.statut === "erreur" && (
						<AlerteErreur
							titre="Enregistrement impossible"
							message={etat.message}
							identifiantCorrelation={etat.identifiantCorrelation}
						/>
					)}
					<FieldGroup>
						<Field data-invalid={Boolean(erreurs.libelle)}>
							<FieldLabel htmlFor="libelle">Libellé</FieldLabel>
							<Input
								id="libelle"
								aria-invalid={Boolean(erreurs.libelle)}
								{...formulaire.register("libelle")}
							/>
							<FieldError errors={[erreurs.libelle]} />
						</Field>
						<Field data-invalid={Boolean(erreurs.description)}>
							<FieldLabel htmlFor="description-tache">Description (facultative)</FieldLabel>
							<Textarea
								id="description-tache"
								rows={3}
								aria-invalid={Boolean(erreurs.description)}
								{...formulaire.register("description")}
							/>
							<FieldError errors={[erreurs.description]} />
						</Field>
						<Controller
							control={formulaire.control}
							name="actif"
							render={({ field }) => (
								<Field orientation="horizontal">
									<Checkbox
										id="actif-tache"
										checked={field.value}
										onCheckedChange={(valeur) => field.onChange(valeur === true)}
									/>
									<FieldLabel htmlFor="actif-tache">Active</FieldLabel>
								</Field>
							)}
						/>
					</FieldGroup>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={enCours}>
								Annuler
							</Button>
						</DialogClose>
						<Button type="submit" disabled={enCours} aria-busy={enCours}>
							{enCours ? "Enregistrement…" : "Enregistrer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
