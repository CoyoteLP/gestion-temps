import { LogInIcon, UserPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { sInscrire, seConnecter } from "@/lib/auth/actions"

type Props = Readonly<{
	/** Chemin relatif de la page demandée avant la connexion (vide : page d'accueil). */
	retour: string
}>

/** Connexion, ou création d'un compte chez le fournisseur d'identité. */
export function BoutonsConnexion({ retour }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<form action={seConnecter}>
				<input type="hidden" name="retour" value={retour} />
				<Button type="submit" className="w-full">
					<LogInIcon /> Se connecter
				</Button>
			</form>
			<form action={sInscrire}>
				<input type="hidden" name="retour" value={retour} />
				<Button type="submit" variant="outline" className="w-full">
					<UserPlusIcon /> Créer un compte
				</Button>
			</form>
		</div>
	)
}
