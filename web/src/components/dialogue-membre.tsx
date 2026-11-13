"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type ReactNode, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { AlerteConflit } from "@/components/alerte-conflit"
import { AlerteErreur } from "@/components/alerte-erreur"
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
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/etat-action"
import type { RoleProjet } from "@/lib/api/modeles"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"
import { ajouterMembreAction, modifierMembreAction } from "@/lib/membres/actions"
import { LIBELLES_ROLE_PROJET, schemaMembre, type ValeursMembre } from "@/lib/membres/schema-membre"

/** Utilisateur proposé ou affiché : identifiant et libellé (« Martin Léa — lea@exemple.fr »). */
export type ChoixUtilisateur = Readonly<{ id: number; libelle: string }>

type Props = Readonly<{
	projetId: number
	/** Bouton qui ouvre le dialogue. */
	declencheur: ReactNode
}> &
	(
		| { mode: "ajout"; candidats: readonly ChoixUtilisateur[] }
		| {
				mode: "modification"
				membre: Readonly<{
					id: number
					version: number
					role: RoleProjet
					utilisateur: ChoixUtilisateur
				}>
		  }
	)

/**
 * Ajout d'un membre à un projet, ou changement de son rôle (administrateur), dans un dialogue. En
 * modification, l'utilisateur est affiché sans pouvoir être changé.
 */
export function DialogueMembre(props: Props) {
	const { projetId, declencheur } = props
	const valeursInitiales = (): ValeursMembre =>
		props.mode === "modification"
			? { utilisateurId: props.membre.utilisateur.id, role: props.membre.role }
			: // Pas de choix par défaut : le schéma refuse 0 (« Choisissez un utilisateur »)
				{ utilisateurId: 0, role: "BACKUP" }
	const [ouvert, setOuvert] = useState(false)
	const [enCours, demarrer] = useTransition()
	const [etat, setEtat] = useState<EtatAction<keyof ValeursMembre>>(ETAT_INITIAL)
	const formulaire = useForm<ValeursMembre>({
		resolver: zodResolver(schemaMembre),
		defaultValues: valeursInitiales(),
	})

	function changerOuverture(valeur: boolean) {
		if (enCours) {
			return
		}
		if (valeur) {
			formulaire.reset(valeursInitiales())
			setEtat(ETAT_INITIAL)
		}
		setOuvert(valeur)
	}

	function enregistrer(valeurs: ValeursMembre) {
		demarrer(async () => {
			const resultat =
				props.mode === "modification"
					? await modifierMembreAction(projetId, props.membre.id, valeurs, props.membre.version)
					: await ajouterMembreAction(projetId, valeurs)
			if (resultat.statut === "invalide") {
				for (const [champ, message] of Object.entries(resultat.erreurs)) {
					formulaire.setError(champ as keyof ValeursMembre, { message })
				}
			} else if (resultat.statut === "succes") {
				toast.success(
					props.mode === "modification" ? "Le rôle a été modifié." : "Le membre a été ajouté.",
					{ duration: DUREE_MESSAGE_SUCCES_MS },
				)
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
						<DialogTitle>
							{props.mode === "modification" ? "Modifier le rôle" : "Ajouter un membre"}
						</DialogTitle>
						<DialogDescription>
							Les membres consultent les saisies du projet et peuvent clôturer ses mois.
						</DialogDescription>
					</DialogHeader>
					{etat.statut === "conflit" && (
						<AlerteConflit titre="Membre modifié entre-temps" message={etat.message} />
					)}
					{etat.statut === "erreur" && (
						<AlerteErreur
							titre="Enregistrement impossible"
							message={etat.message}
							identifiantCorrelation={etat.identifiantCorrelation}
						/>
					)}
					<FieldGroup>
						{props.mode === "modification" ? (
							<Field>
								<FieldTitle>Utilisateur</FieldTitle>
								<p className="text-sm">{props.membre.utilisateur.libelle}</p>
							</Field>
						) : (
							<Controller
								control={formulaire.control}
								name="utilisateurId"
								render={({ field }) => (
									<Field data-invalid={Boolean(erreurs.utilisateurId)}>
										<FieldLabel htmlFor="utilisateur-membre">Utilisateur</FieldLabel>
										<Select
											value={field.value ? String(field.value) : ""}
											onValueChange={(valeur) => field.onChange(Number(valeur))}
											disabled={props.candidats.length === 0}
										>
											<SelectTrigger
												id="utilisateur-membre"
												className="w-full"
												aria-invalid={Boolean(erreurs.utilisateurId)}
											>
												<SelectValue
													placeholder={
														props.candidats.length === 0
															? "Aucun utilisateur actif à ajouter"
															: "Sélectionner dans la liste"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{props.candidats.map((candidat) => (
													<SelectItem key={candidat.id} value={String(candidat.id)}>
														{candidat.libelle}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FieldError errors={[erreurs.utilisateurId]} />
									</Field>
								)}
							/>
						)}
						<Controller
							control={formulaire.control}
							name="role"
							render={({ field }) => (
								<Field data-invalid={Boolean(erreurs.role)}>
									<FieldLabel htmlFor="role-membre">Rôle</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger
											id="role-membre"
											className="w-full"
											aria-invalid={Boolean(erreurs.role)}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(LIBELLES_ROLE_PROJET).map(([role, libelle]) => (
												<SelectItem key={role} value={role}>
													{libelle}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={[erreurs.role]} />
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
