import type { ReactNode } from "react"

type Props = Readonly<{
	titre: string
	description?: string
	/** Actions de la page (boutons), alignées à droite. */
	actions?: ReactNode
}>

/** Titre et description d'une page de l'application. */
export function EnTetePage({ titre, description, actions }: Props) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-2">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
				{description && <p className="text-muted-foreground">{description}</p>}
			</div>
			{actions}
		</div>
	)
}
