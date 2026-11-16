"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { SaveIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { AlerteConflit } from "@/components/alerte-conflit"
import { AlerteErreur } from "@/components/alerte-erreur"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { modifierProfil } from "@/lib/compte/actions"
import { ETAT_INITIAL, type EtatAction } from "@/lib/actions/etat-action"
import { schemaProfil, type Profil } from "@/lib/compte/schema-profil"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"

const MESSAGE_PROFIL_ENREGISTRE = "Les modifications ont été correctement réalisées."

type Props = Readonly<
	Profil & {
		/** Version de la fiche lue, renvoyée à l'API (409 si elle a changé entre-temps). */
		version: number
	}
>

/**
 * Modification du nom et du prénom de l'utilisateur connecté. Après un enregistrement, la page est
 * rafraîchie : le parent doit remonter le formulaire sur la nouvelle version (`key={version}`).
 */
export function FormulaireProfil({ nom, prenom, version }: Props) {
	const [enCours, demarrer] = useTransition()
	const [etat, setEtat] = useState<EtatAction<keyof Profil>>(ETAT_INITIAL)
	const formulaire = useForm<Profil>({
		resolver: zodResolver(schemaProfil),
		defaultValues: { nom, prenom },
	})

	function enregistrer(profil: Profil) {
		demarrer(async () => {
			const resultat = await modifierProfil(profil, version)
			if (resultat.statut === "invalide") {
				for (const [champ, message] of Object.entries(resultat.erreurs)) {
					formulaire.setError(champ as keyof Profil, { message })
				}
			} else if (resultat.statut === "succes") {
				toast.success(MESSAGE_PROFIL_ENREGISTRE, { duration: DUREE_MESSAGE_SUCCES_MS })
			}
			setEtat(resultat)
		})
	}

	const erreurs = formulaire.formState.errors
	return (
		<form onSubmit={formulaire.handleSubmit(enregistrer)} noValidate className="flex flex-col gap-4">
			{etat.statut === "conflit" && (
				<AlerteConflit titre="Profil modifié entre-temps" message={etat.message} />
			)}
			{etat.statut === "erreur" && (
				<AlerteErreur
					titre="Enregistrement impossible"
					message={etat.message}
					identifiantCorrelation={etat.identifiantCorrelation}
				/>
			)}
			<FieldGroup>
				<Field data-invalid={Boolean(erreurs.prenom)}>
					<FieldLabel htmlFor="prenom">Prénom</FieldLabel>
					<Input
						id="prenom"
						autoComplete="given-name"
						aria-invalid={Boolean(erreurs.prenom)}
						{...formulaire.register("prenom")}
					/>
					<FieldError errors={[erreurs.prenom]} />
				</Field>
				<Field data-invalid={Boolean(erreurs.nom)}>
					<FieldLabel htmlFor="nom">Nom</FieldLabel>
					<Input
						id="nom"
						autoComplete="family-name"
						aria-invalid={Boolean(erreurs.nom)}
						{...formulaire.register("nom")}
					/>
					<FieldError errors={[erreurs.nom]} />
				</Field>
			</FieldGroup>
			<Button type="submit" className="w-fit" disabled={enCours} aria-busy={enCours}>
				<SaveIcon /> {enCours ? "Enregistrement…" : "Enregistrer"}
			</Button>
		</form>
	)
}
