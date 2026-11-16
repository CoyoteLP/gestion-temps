"use client"

import { useRouter } from "next/navigation"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = Readonly<{
	projets: readonly Readonly<{ id: number; code: string; nom: string }>[]
	projetId: number
	/** Mois affiché (`AAAA-MM`), conservé au changement de projet. */
	mois: string
}>

/** Choix du projet de la page Équipe : ouvre le même mois pour le projet choisi. */
export function SelectionProjetEquipe({ projets, projetId, mois }: Props) {
	const router = useRouter()
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Label htmlFor="projet-equipe">Projet</Label>
			<Select
				value={String(projetId)}
				onValueChange={(valeur) => router.push(`/equipe?projet=${valeur}&mois=${mois}`)}
			>
				<SelectTrigger id="projet-equipe" className="w-full sm:w-80">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{projets.map((projet) => (
						<SelectItem key={projet.id} value={String(projet.id)}>
							{projet.code} · {projet.nom}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
