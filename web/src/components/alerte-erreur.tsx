import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Props = {
	message: string
	/** Identifiant de corrélation, à communiquer au support : il retrouve la requête dans les logs. */
	identifiantCorrelation?: string
	titre?: string
}

/** Erreur affichable (message de l'API, en français) avec sa référence pour le support. */
export function AlerteErreur({
	message,
	identifiantCorrelation,
	titre = "Impossible d'afficher ces données",
}: Props) {
	return (
		<Alert variant="destructive">
			<CircleAlertIcon />
			<AlertTitle>{titre}</AlertTitle>
			<AlertDescription>
				<p>{message}</p>
				{identifiantCorrelation && (
					<p className="text-xs">
						Référence : <code>{identifiantCorrelation}</code>
					</p>
				)}
			</AlertDescription>
		</Alert>
	)
}
