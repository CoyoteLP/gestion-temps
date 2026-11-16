"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { SaveIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { AlerteConflit } from "@/components/alerte-conflit"
import { AlerteErreur } from "@/components/alerte-erreur"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/etat-action"
import type { Projet } from "@/lib/api/modeles"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"
import { creerProjetAction, modifierProjetAction } from "@/lib/projets/actions"
import { schemaProjet, type ValeursProjet, valeursDuProjet } from "@/lib/projets/schema-projet"

type Props = Readonly<{
	/** Projet à modifier ; absent pour une création. */
	projet?: Projet
}>

/**
 * Création ou modification d'un projet (administrateur). Après l'enregistrement, ouvre la fiche du
 * projet. En modification, le parent remonte le formulaire sur la nouvelle version (`key={version}`).
 */
export function FormulaireProjet({ projet }: Props) {
	const router = useRouter()
	const [enCours, demarrer] = useTransition()
	const [etat, setEtat] = useState<EtatAction<keyof ValeursProjet>>(ETAT_INITIAL)
	const formulaire = useForm<ValeursProjet>({
		resolver: zodResolver(schemaProjet),
		defaultValues: valeursDuProjet(projet),
	})

	function enregistrer(valeurs: ValeursProjet) {
		demarrer(async () => {
			const resultat = projet
				? await modifierProjetAction(projet.id, valeurs, projet.version)
				: await creerProjetAction(valeurs)
			if (resultat.statut === "invalide") {
				for (const [champ, message] of Object.entries(resultat.erreurs)) {
					formulaire.setError(champ as keyof ValeursProjet, { message })
				}
			} else if (resultat.statut === "succes") {
				toast.success(projet ? "Le projet a été modifié." : "Le projet a été créé.", {
					duration: DUREE_MESSAGE_SUCCES_MS,
				})
				router.push(`/projets/${resultat.id}`)
			}
			setEtat(resultat)
		})
	}

	const erreurs = formulaire.formState.errors
	const retour = projet ? `/projets/${projet.id}` : "/projets"
	return (
		<form onSubmit={formulaire.handleSubmit(enregistrer)} noValidate className="flex flex-col gap-4">
			{etat.statut === "conflit" && (
				<AlerteConflit titre="Enregistrement impossible" message={etat.message} />
			)}
			{etat.statut === "erreur" && (
				<AlerteErreur
					titre="Enregistrement impossible"
					message={etat.message}
					identifiantCorrelation={etat.identifiantCorrelation}
				/>
			)}
			<FieldGroup>
				<Field data-invalid={Boolean(erreurs.code)}>
					<FieldLabel htmlFor="code">Code</FieldLabel>
					<Input
						id="code"
						className="max-w-48 font-mono"
						aria-invalid={Boolean(erreurs.code)}
						{...formulaire.register("code")}
					/>
					<FieldError errors={[erreurs.code]} />
				</Field>
				<Field data-invalid={Boolean(erreurs.nom)}>
					<FieldLabel htmlFor="nom">Nom</FieldLabel>
					<Input id="nom" aria-invalid={Boolean(erreurs.nom)} {...formulaire.register("nom")} />
					<FieldError errors={[erreurs.nom]} />
				</Field>
				<Field data-invalid={Boolean(erreurs.description)}>
					<FieldLabel htmlFor="description">Description (facultative)</FieldLabel>
					<Textarea
						id="description"
						rows={4}
						aria-invalid={Boolean(erreurs.description)}
						{...formulaire.register("description")}
					/>
					<FieldError errors={[erreurs.description]} />
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={Boolean(erreurs.dateDebut)}>
						<FieldLabel htmlFor="dateDebut">Date de début (facultative)</FieldLabel>
						<Input
							id="dateDebut"
							type="date"
							aria-invalid={Boolean(erreurs.dateDebut)}
							{...formulaire.register("dateDebut")}
						/>
						<FieldError errors={[erreurs.dateDebut]} />
					</Field>
					<Field data-invalid={Boolean(erreurs.dateFin)}>
						<FieldLabel htmlFor="dateFin">Date de fin (facultative)</FieldLabel>
						<Input
							id="dateFin"
							type="date"
							aria-invalid={Boolean(erreurs.dateFin)}
							{...formulaire.register("dateFin")}
						/>
						<FieldError errors={[erreurs.dateFin]} />
					</Field>
				</div>
				<Controller
					control={formulaire.control}
					name="actif"
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="actif"
								checked={field.value}
								onCheckedChange={(valeur) => field.onChange(valeur === true)}
							/>
							<FieldLabel htmlFor="actif">
								Actif (on peut saisir du temps sur ses tâches)
							</FieldLabel>
						</Field>
					)}
				/>
			</FieldGroup>
			<div className="flex gap-2">
				<Button type="submit" disabled={enCours} aria-busy={enCours}>
					<SaveIcon /> {enCours ? "Enregistrement…" : "Enregistrer"}
				</Button>
				<Button variant="outline" asChild>
					<Link href={retour}>Annuler</Link>
				</Button>
			</div>
		</form>
	)
}
