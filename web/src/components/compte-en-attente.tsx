import { HourglassIcon, UserPlusIcon } from "lucide-react"

import { FinaliserInscription } from "@/components/finaliser-inscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Props = Readonly<{
	/** `inactif` : fiche en attente de validation ; `absent` : pas encore de fiche. */
	etat: "inactif" | "absent"
}>

/**
 * Affiché à la place d'une page quand le compte n'a pas de fiche active : l'API refuserait toutes
 * ses requêtes (403), sauf la lecture et la création de sa propre fiche.
 */
export function CompteEnAttente({ etat }: Props) {
	if (etat === "inactif") {
		return (
			<Card className="max-w-lg">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HourglassIcon className="size-4" /> Compte en attente de validation
					</CardTitle>
					<CardDescription>
						Votre inscription est enregistrée. Un administrateur doit maintenant activer votre
						compte : rien à faire de votre côté. Rechargez la page une fois qu&apos;il est activé.
					</CardDescription>
				</CardHeader>
			</Card>
		)
	}
	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserPlusIcon className="size-4" /> Inscription à finaliser
				</CardTitle>
				<CardDescription>
					Votre compte de connexion n&apos;est pas encore enregistré dans l&apos;application. Si
					votre adresse email vient d&apos;être vérifiée, finalisez votre inscription.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FinaliserInscription />
			</CardContent>
		</Card>
	)
}
