"use client"

import { UserCheckIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { EtatAction } from "@/lib/actions/etat-action"
import { DUREE_MESSAGE_SUCCES_MS } from "@/lib/constantes"

type Props = Readonly<{
	/** Nom affiché dans la confirmation (« Léa Martin »). */
	nom: string
	/** Server Action d'activation, liée à la fiche par `bind`. */
	action: () => Promise<EtatAction<never>>
}>

/**
 * Valide l'inscription d'un utilisateur (fiche activée), sans confirmation : l'opération se défait
 * par une désactivation. Le résultat, succès ou refus, s'affiche en message temporaire.
 */
export function BoutonActivation({ nom, action }: Props) {
	const [enCours, demarrer] = useTransition()

	function activer() {
		demarrer(async () => {
			const resultat = await action()
			if (resultat.statut === "succes") {
				toast.success(`Le compte de ${nom} est activé.`, { duration: DUREE_MESSAGE_SUCCES_MS })
			} else if (resultat.statut === "conflit" || resultat.statut === "erreur") {
				toast.error(resultat.message, {
					description:
						resultat.statut === "erreur" && resultat.identifiantCorrelation
							? `Référence : ${resultat.identifiantCorrelation}`
							: undefined,
				})
			}
		})
	}

	return (
		<Button size="sm" onClick={activer} disabled={enCours} aria-busy={enCours}>
			<UserCheckIcon /> {enCours ? "Activation…" : "Activer"}
		</Button>
	)
}
