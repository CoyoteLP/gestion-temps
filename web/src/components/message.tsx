import { CircleAlertIcon, InfoIcon, type LucideIcon, TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Niveau d'un message : information en bleu, avertissement en orange, erreur en rouge. */
export type NiveauMessage = "information" | "avertissement" | "erreur"

const STYLES: Record<NiveauMessage, { icone: LucideIcon; texte: string; description: string }> = {
	information: {
		icone: InfoIcon,
		texte: "text-information",
		description: "*:data-[slot=alert-description]:text-information/90",
	},
	avertissement: {
		icone: TriangleAlertIcon,
		texte: "text-avertissement",
		description: "*:data-[slot=alert-description]:text-avertissement/90",
	},
	erreur: {
		icone: CircleAlertIcon,
		texte: "text-destructive",
		description: "*:data-[slot=alert-description]:text-destructive/90",
	},
}

type PropsMessage = Readonly<{
	niveau: NiveauMessage
	children: ReactNode
	/** Rôle ARIA, par exemple `status` pour un message qui change pendant la saisie. */
	role?: "status" | "alert"
}>

/**
 * Message court dans un formulaire ou une page, sur une ligne avec son icône, coloré selon son niveau
 * (convention de l'application : information en bleu, avertissement en orange, erreur en rouge).
 */
export function Message({ niveau, children, role }: PropsMessage) {
	const { icone: Icone, texte } = STYLES[niveau]
	return (
		<p className={`flex items-start gap-2 text-sm ${texte}`} role={role}>
			<Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<span>{children}</span>
		</p>
	)
}

type PropsEncadre = Readonly<{
	niveau: Exclude<NiveauMessage, "erreur">
	titre: string
	children: ReactNode
}>

/**
 * Encadré d'information ou d'avertissement, coloré selon son niveau. Pour une erreur de l'API,
 * utiliser `AlerteErreur`, qui affiche aussi la référence pour le support.
 */
export function Encadre({ niveau, titre, children }: PropsEncadre) {
	const { icone: Icone, texte, description } = STYLES[niveau]
	return (
		<Alert className={`${texte} ${description}`}>
			<Icone aria-hidden="true" />
			<AlertTitle>{titre}</AlertTitle>
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	)
}
