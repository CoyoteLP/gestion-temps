import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Form from "next/form"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formaterJourLong } from "@/lib/format"
import { lundiDe, type Semaine } from "@/lib/saisies/semaine"

const CHEMIN = "/saisies"

type Props = Readonly<{
	semaine: Semaine
	/** Date du jour (`AAAA-MM-JJ`), pour « Cette semaine ». */
	dateDuJour: string
}>

/**
 * Titre de la semaine affichée et navigation : semaine précédente, en cours, suivante, et choix
 * d'une date (« Aller à la semaine du… », ramenée à son lundi). Simple formulaire : fonctionne aussi
 * sans JavaScript.
 */
export function NavigationSemaine({ semaine, dateDuJour }: Props) {
	const estSemaineEnCours = semaine.lundi === lundiDe(dateDuJour)
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<h2 className="text-lg font-semibold">
				Semaine du {formaterJourLong(semaine.lundi)} au {formaterJourLong(semaine.jours[6])}
			</h2>
			<nav aria-label="Changer de semaine" className="flex flex-wrap items-center gap-2">
				<Button variant="outline" size="sm" asChild>
					<Link href={`${CHEMIN}?semaine=${semaine.precedente}`}>
						<ChevronLeftIcon /> Semaine précédente
					</Link>
				</Button>
				<Button variant={estSemaineEnCours ? "secondary" : "outline"} size="sm" asChild>
					<Link href={CHEMIN} aria-current={estSemaineEnCours ? "date" : undefined}>
						Cette semaine
					</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link href={`${CHEMIN}?semaine=${semaine.suivante}`}>
						Semaine suivante <ChevronRightIcon />
					</Link>
				</Button>
				<Form action={CHEMIN} className="flex items-center gap-1">
					<label htmlFor="aller-semaine" className="sr-only">
						Aller à la semaine du
					</label>
					<Input
						id="aller-semaine"
						name="semaine"
						type="date"
						defaultValue={semaine.lundi}
						required
						className="h-8 w-auto"
					/>
					<Button type="submit" variant="outline" size="sm">
						Aller
					</Button>
				</Form>
			</nav>
		</div>
	)
}
