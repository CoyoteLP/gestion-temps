import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { Mois } from "@/lib/equipe/mois"
import { formaterMois } from "@/lib/format"
import { moisDe } from "@/lib/saisies/semaine"

const CHEMIN = "/equipe"

type Props = Readonly<{
	mois: Mois
	/** Date du jour (`AAAA-MM-JJ`), pour « Ce mois-ci ». */
	dateDuJour: string
	/** Projet affiché, conservé d'un mois à l'autre. */
	projetId: number
}>

/** Titre du mois affiché et navigation : mois précédent, en cours, suivant (projet conservé). */
export function NavigationMois({ mois, dateDuJour, projetId }: Props) {
	const estMoisEnCours = mois.mois === moisDe(dateDuJour)
	const lien = (valeur?: string) => `${CHEMIN}?projet=${projetId}${valeur ? `&mois=${valeur}` : ""}`
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<h2 className="text-lg font-semibold first-letter:uppercase">{formaterMois(mois.mois)}</h2>
			<nav aria-label="Changer de mois" className="flex flex-wrap items-center gap-2">
				<Button variant="outline" size="sm" asChild>
					<Link href={lien(mois.precedent)}>
						<ChevronLeftIcon /> Mois précédent
					</Link>
				</Button>
				<Button variant={estMoisEnCours ? "secondary" : "outline"} size="sm" asChild>
					<Link href={lien()} aria-current={estMoisEnCours ? "date" : undefined}>
						Ce mois-ci
					</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link href={lien(mois.suivant)}>
						Mois suivant <ChevronRightIcon />
					</Link>
				</Button>
			</nav>
		</div>
	)
}
