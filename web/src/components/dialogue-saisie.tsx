"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MinusIcon, PlusIcon } from "lucide-react"
import { type ReactNode, useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { AlerteConflit } from "@/components/alerte-conflit"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/etat-action"
import type { Saisie } from "@/lib/api/modeles"
import {
	DUREE_MAX_SAISIE,
	DUREE_MESSAGE_SUCCES_MS,
	DUREE_MIN_SAISIE,
	LONGUEUR_MAX_COMMENTAIRE,
	MAX_HEURES_JOUR,
	PAS_DUREE_SAISIE,
	SEUIL_ALERTE_HEURES_JOUR,
} from "@/lib/constantes"
import { formaterDuree, formaterPeriode } from "@/lib/format"
import { creerSaisieAction, modifierSaisieAction } from "@/lib/saisies/actions"
import type { OptionsSaisie } from "@/lib/saisies/options"
import { schemaSaisie, type ValeursSaisie, valeursDeLaSaisie } from "@/lib/saisies/schema-saisie"
import { moisDe } from "@/lib/saisies/semaine"

type Props = Readonly<{
	options: OptionsSaisie
	/** Saisie à modifier ; absente pour une création. */
	saisie?: Saisie
	/** Jour proposé à la création. */
	jourParDefaut: string
	/** Bouton qui ouvre le dialogue. */
	declencheur: ReactNode
}>

/**
 * Création ou modification d'une saisie de l'utilisateur connecté : projet (dont il est membre),
 * tâche, jour, durée par pas de 0,5 h et commentaire. Le dialogue rappelle le temps déjà saisi ce
 * jour-là et signale un mois clôturé ou un jour hors de la période du projet ; l'API reste seule juge.
 */
export function DialogueSaisie({ options, saisie, jourParDefaut, declencheur }: Props) {
	const projetDeLaSaisie = saisie
		? options.taches.find((tache) => tache.id === saisie.tacheId)?.projetId
		: undefined
	const valeursInitiales = () => valeursDeLaSaisie(saisie, projetDeLaSaisie ?? 0, jourParDefaut)
	const [ouvert, setOuvert] = useState(false)
	const [enCours, demarrer] = useTransition()
	const [etat, setEtat] = useState<EtatAction<keyof ValeursSaisie>>(ETAT_INITIAL)
	const formulaire = useForm<ValeursSaisie>({
		resolver: zodResolver(schemaSaisie),
		defaultValues: valeursInitiales(),
	})
	const [projetId, jour, duree] = useWatch({
		control: formulaire.control,
		name: ["projetId", "jour", "duree"],
	})

	// Projets et tâches où l'on peut saisir ; ceux de la saisie modifiée restent proposés
	const projets = options.projets.filter((projet) => projet.ouvert || projet.id === projetDeLaSaisie)
	const taches = options.taches.filter(
		(tache) => tache.projetId === projetId && (tache.actif || tache.id === saisie?.tacheId),
	)
	const projet = options.projets.find((candidat) => candidat.id === projetId)

	// En modification, la saisie elle-même n'est pas comptée dans le temps déjà saisi
	const dureeDeLaSaisie = saisie?.jour === jour ? saisie.duree : 0
	const dejaSaisi = jour in options.cumulParJour ? options.cumulParJour[jour] - dureeDeLaSaisie : null
	// Total de la journée avec cette saisie : au-delà du seuil, simple avertissement
	const totalAvecSaisie = dejaSaisi !== null && Number.isFinite(duree) ? dejaSaisi + duree : null
	const journeeLongue =
		totalAvecSaisie !== null &&
		totalAvecSaisie > SEUIL_ALERTE_HEURES_JOUR &&
		totalAvecSaisie <= MAX_HEURES_JOUR
	// Au-delà de 24 h, l'API refusera l'enregistrement : erreur
	const journeeDepassee = totalAvecSaisie !== null && totalAvecSaisie > MAX_HEURES_JOUR
	const moisClos = projet !== undefined && options.clotures.includes(`${projet.id}:${moisDe(jour)}`)
	const horsPeriode =
		projet !== undefined &&
		((projet.dateDebut !== null && jour < projet.dateDebut) ||
			(projet.dateFin !== null && jour > projet.dateFin))

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

	function ajusterDuree(pas: number) {
		const actuelle = Number.isFinite(duree) ? duree : DUREE_MIN_SAISIE
		const nouvelle = Math.min(DUREE_MAX_SAISIE, Math.max(DUREE_MIN_SAISIE, actuelle + pas))
		formulaire.setValue("duree", nouvelle, { shouldValidate: true })
	}

	function enregistrer(valeurs: ValeursSaisie) {
		demarrer(async () => {
			const resultat = saisie
				? await modifierSaisieAction(saisie.id, valeurs, saisie.version)
				: await creerSaisieAction(valeurs)
			if (resultat.statut === "invalide") {
				for (const [champ, message] of Object.entries(resultat.erreurs)) {
					formulaire.setError(champ as keyof ValeursSaisie, { message })
				}
			} else if (resultat.statut === "succes") {
				toast.success(saisie ? "La saisie a été modifiée." : "La saisie a été enregistrée.", {
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
						<DialogTitle>{saisie ? "Modifier la saisie" : "Nouvelle saisie"}</DialogTitle>
						<DialogDescription>
							Temps passé sur une tâche d&apos;un projet dont vous êtes membre.
						</DialogDescription>
					</DialogHeader>
					{etat.statut === "conflit" && (
						<AlerteConflit titre="Saisie modifiée entre-temps" message={etat.message} />
					)}
					{etat.statut === "erreur" && (
						<AlerteErreur
							titre="Enregistrement impossible"
							message={etat.message}
							identifiantCorrelation={etat.identifiantCorrelation}
						/>
					)}
					<FieldGroup>
						<Controller
							control={formulaire.control}
							name="projetId"
							render={({ field }) => (
								<Field data-invalid={Boolean(erreurs.projetId)}>
									<FieldLabel htmlFor="projet-saisie">Projet</FieldLabel>
									<Select
										value={field.value ? String(field.value) : ""}
										onValueChange={(valeur) => {
											field.onChange(Number(valeur))
											formulaire.setValue("tacheId", 0)
										}}
									>
										<SelectTrigger
											id="projet-saisie"
											className="w-full"
											aria-invalid={Boolean(erreurs.projetId)}
										>
											<SelectValue placeholder="Sélectionner un projet" />
										</SelectTrigger>
										<SelectContent>
											{projets.map((candidat) => (
												<SelectItem key={candidat.id} value={String(candidat.id)}>
													{candidat.code} · {candidat.nom}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{projet && (
										<FieldDescription>
											Période : {formaterPeriode(projet.dateDebut, projet.dateFin)}
										</FieldDescription>
									)}
									<FieldError errors={[erreurs.projetId]} />
								</Field>
							)}
						/>
						<Controller
							control={formulaire.control}
							name="tacheId"
							render={({ field }) => (
								<Field data-invalid={Boolean(erreurs.tacheId)}>
									<FieldLabel htmlFor="tache-saisie">Tâche</FieldLabel>
									<Select
										value={field.value ? String(field.value) : ""}
										onValueChange={(valeur) => field.onChange(Number(valeur))}
										disabled={!projetId}
									>
										<SelectTrigger
											id="tache-saisie"
											className="w-full"
											aria-invalid={Boolean(erreurs.tacheId)}
										>
											<SelectValue
												placeholder={
													projetId && taches.length === 0
														? "Aucune tâche active dans ce projet"
														: "Sélectionner une tâche"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{taches.map((tache) => (
												<SelectItem key={tache.id} value={String(tache.id)}>
													{tache.libelle}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={[erreurs.tacheId]} />
								</Field>
							)}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field data-invalid={Boolean(erreurs.jour)}>
								<FieldLabel htmlFor="jour-saisie">Jour</FieldLabel>
								<Input
									id="jour-saisie"
									type="date"
									aria-invalid={Boolean(erreurs.jour)}
									{...formulaire.register("jour")}
								/>
								<FieldError errors={[erreurs.jour]} />
							</Field>
							<Field data-invalid={Boolean(erreurs.duree)}>
								<FieldLabel htmlFor="duree-saisie">Durée (heures)</FieldLabel>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={`Diminuer la durée de ${formaterDuree(PAS_DUREE_SAISIE)}`}
										onClick={() => ajusterDuree(-PAS_DUREE_SAISIE)}
									>
										<MinusIcon />
									</Button>
									<Input
										id="duree-saisie"
										type="number"
										inputMode="decimal"
										min={DUREE_MIN_SAISIE}
										max={DUREE_MAX_SAISIE}
										step={PAS_DUREE_SAISIE}
										className="text-center"
										aria-invalid={Boolean(erreurs.duree)}
										{...formulaire.register("duree", { valueAsNumber: true })}
									/>
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={`Augmenter la durée de ${formaterDuree(PAS_DUREE_SAISIE)}`}
										onClick={() => ajusterDuree(PAS_DUREE_SAISIE)}
									>
										<PlusIcon />
									</Button>
								</div>
								<FieldError errors={[erreurs.duree]} />
							</Field>
						</div>
						{dejaSaisi !== null && (
							<div className="flex flex-col gap-1" aria-live="polite">
								<Message niveau="information">
									Déjà saisi ce jour : {formaterDuree(dejaSaisi)} (reste{" "}
									{formaterDuree(Math.max(0, MAX_HEURES_JOUR - dejaSaisi))})
								</Message>
								{journeeLongue && (
									<Message niveau="avertissement">
										Avec cette saisie, la journée atteindra{" "}
										{formaterDuree(totalAvecSaisie)}, au-delà de{" "}
										{formaterDuree(SEUIL_ALERTE_HEURES_JOUR)}.
									</Message>
								)}
								{journeeDepassee && (
									<Message niveau="erreur">
										Le total de la journée dépasse {formaterDuree(MAX_HEURES_JOUR)} (
										{formaterDuree(totalAvecSaisie)} avec cette saisie) : la saisie sera
										refusée.
									</Message>
								)}
							</div>
						)}
						{moisClos && (
							<Message niveau="erreur" role="status">
								Ce mois est clôturé pour ce projet : la saisie sera refusée.
							</Message>
						)}
						{!moisClos && horsPeriode && (
							<Message niveau="erreur" role="status">
								Ce jour est hors de la période du projet : la saisie sera refusée.
							</Message>
						)}
						<Field data-invalid={Boolean(erreurs.commentaire)}>
							<FieldLabel htmlFor="commentaire-saisie">Commentaire (facultatif)</FieldLabel>
							<Textarea
								id="commentaire-saisie"
								rows={2}
								maxLength={LONGUEUR_MAX_COMMENTAIRE}
								aria-invalid={Boolean(erreurs.commentaire)}
								{...formulaire.register("commentaire")}
							/>
							<FieldError errors={[erreurs.commentaire]} />
						</Field>
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
