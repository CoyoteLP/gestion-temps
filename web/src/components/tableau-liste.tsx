import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, XIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { AffichageFiltres, BoutonFiltres, FiltresColonnes } from "@/components/filtres-colonnes"
import { PaginationListe } from "@/components/pagination-liste"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PageResponse } from "@/lib/api/types"
import {
	aDesFiltres,
	type ColonneListe,
	type DefinitionListe,
	type EtatListe,
	lienListe,
	type ParametresUrl,
} from "@/lib/listes/etat-liste"

type Props = Readonly<{
	definition: DefinitionListe
	etat: EtatListe
	/** Chemin de la page, pour les liens de tri, de filtre et de pagination. */
	chemin: string
	/** Paramètres actuels de l'URL (conservés : autres listes de la page). */
	parametres: ParametresUrl
	page: Pick<PageResponse<unknown>, "page" | "pages" | "total" | "contenu">
	/** Libellé des éléments au singulier et au pluriel (« projet », « projets »). */
	libelles: Readonly<{ un: string; plusieurs: string }>
	/** Messages d'une liste vide : sans filtre (« Aucun projet. ») et avec (« Aucun projet ne correspond… »). */
	messages: Readonly<{ vide: string; aucunResultat: string }>
	/**
	 * Lignes du tableau (`TableRow`), qui reprennent les classes des colonnes et se terminent toujours
	 * par une cellule d'actions (vide si la liste n'en a pas) : la loupe des filtres est au-dessus.
	 */
	children: ReactNode
}>

/**
 * Tableau commun aux listes de l'application : en-têtes triables, ligne de filtres repliable (loupe
 * en bout d'en-tête ; masquée par défaut, ouverte si un filtre est actif), message de liste vide et
 * pagination. Le tri et les filtres sont faits par l'API sur toute la liste ; leur état est
 * dans l'URL (avec le préfixe de la liste).
 */
export function TableauListe({
	definition,
	etat,
	chemin,
	parametres,
	page,
	libelles,
	messages,
	children,
}: Props) {
	const filtre = aDesFiltres(definition, etat)
	const nombreColonnes = definition.colonnes.length + 1
	const effacement = Object.fromEntries(
		definition.colonnes.filter((colonne) => colonne.filtre).map((colonne) => [colonne.cle, null]),
	)

	return (
		<div className="flex flex-col gap-2">
			{filtre && (
				<Button variant="ghost" size="sm" className="w-fit self-end" asChild>
					<Link href={lienListe(chemin, parametres, definition.prefixe, effacement)} scroll={false}>
						<XIcon /> Effacer les filtres
					</Link>
				</Button>
			)}
			<Card className="py-0">
				<CardContent className="px-0">
					<AffichageFiltres ouverteAuDepart={filtre}>
						<Table>
							<TableHeader>
								<TableRow>
									{definition.colonnes.map((colonne) => (
										<EnTeteColonne
											key={colonne.cle}
											colonne={colonne}
											etat={etat}
											lien={(changements) =>
												lienListe(chemin, parametres, definition.prefixe, changements)
											}
										/>
									))}
									<TableHead className="w-px pr-4 text-right">
										<BoutonFiltres actifs={filtre} />
									</TableHead>
								</TableRow>
								<FiltresColonnes
									colonnes={definition.colonnes}
									prefixe={definition.prefixe}
									chemin={chemin}
									parametres={parametres}
									valeurs={etat.filtres}
								/>
							</TableHeader>
							<TableBody>
								{page.contenu.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={nombreColonnes}
											className="py-8 text-center text-muted-foreground"
										>
											{filtre ? messages.aucunResultat : messages.vide}
										</TableCell>
									</TableRow>
								) : (
									children
								)}
							</TableBody>
						</Table>
					</AffichageFiltres>
				</CardContent>
			</Card>
			<PaginationListe
				page={page}
				chemin={chemin}
				parametres={parametres}
				prefixe={definition.prefixe}
				libelle={page.total > 1 ? libelles.plusieurs : libelles.un}
			/>
		</div>
	)
}

type PropsEnTete = Readonly<{
	colonne: ColonneListe
	etat: EtatListe
	lien: (changements: Readonly<Record<string, string | null>>) => string
}>

/** En-tête d'une colonne ; s'il est triable, un lien qui trie (croissant, puis décroissant). */
function EnTeteColonne({ colonne, etat, lien }: PropsEnTete) {
	if (!colonne.triable) {
		return <TableHead className={colonne.classe}>{colonne.libelle}</TableHead>
	}
	const triee = etat.tri === colonne.cle
	const croissant = etat.sens === "asc"
	const prochainSens = triee && croissant ? "desc" : "asc"
	const Icone = !triee ? ArrowUpDownIcon : croissant ? ArrowUpIcon : ArrowDownIcon
	return (
		<TableHead
			className={colonne.classe}
			aria-sort={triee ? (croissant ? "ascending" : "descending") : undefined}
		>
			<Link
				href={lien({ tri: colonne.cle, sens: prochainSens === "desc" ? "desc" : null })}
				scroll={false}
				className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				{colonne.libelle}
				<Icone aria-hidden="true" className={`size-3.5 ${triee ? "" : "opacity-40"}`} />
				<span className="sr-only">
					{triee ? `, trié par ordre ${croissant ? "croissant" : "décroissant"}` : ""}, trier par
					ordre {prochainSens === "asc" ? "croissant" : "décroissant"}
				</span>
			</Link>
		</TableHead>
	)
}
