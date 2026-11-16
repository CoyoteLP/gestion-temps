"use client"

import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useEffect, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import { DELAI_FILTRE_MS, LONGUEUR_MAX_FILTRE } from "@/lib/constantes"
import { type ColonneListe, lienListe, type OptionFiltre, type ParametresUrl } from "@/lib/listes/etat-liste"

/** Radix Select n'accepte pas d'option de valeur vide : « Tous » (paramètre absent) passe par celle-ci. */
const VALEUR_SANS_FILTRE = "*"

/** Affichage de la ligne de filtres, partagé entre le bouton de l'en-tête et la ligne elle-même. */
const ContexteFiltres = createContext<Readonly<{
	visibles: boolean
	basculer: () => void
	idLigne: string
}> | null>(null)

function useAffichageFiltres() {
	const contexte = useContext(ContexteFiltres)
	if (!contexte) {
		throw new Error("À placer dans un AffichageFiltres")
	}
	return contexte
}

/**
 * Affichage de la ligne de filtres d'une liste : masquée par défaut, ouverte au départ si un filtre
 * est actif (on voit toujours pourquoi la liste est réduite). L'état survit aux changements de filtre
 * (la page est rendue à nouveau, le composant reste).
 */
export function AffichageFiltres({
	ouverteAuDepart,
	children,
}: Readonly<{ ouverteAuDepart: boolean; children: ReactNode }>) {
	const [visibles, setVisibles] = useState(ouverteAuDepart)
	const idLigne = useId()
	return (
		<ContexteFiltres value={{ visibles, basculer: () => setVisibles((valeur) => !valeur), idLigne }}>
			{children}
		</ContexteFiltres>
	)
}

/** Bouton loupe de l'en-tête : affiche ou masque la ligne de filtres ; mis en évidence si un filtre est actif. */
export function BoutonFiltres({ actifs }: Readonly<{ actifs: boolean }>) {
	const { visibles, basculer, idLigne } = useAffichageFiltres()
	const libelle = `${visibles ? "Masquer" : "Afficher"} les filtres${actifs ? " (filtres actifs)" : ""}`
	return (
		<Button
			type="button"
			variant={actifs ? "secondary" : "ghost"}
			size="icon-sm"
			aria-expanded={visibles}
			aria-controls={idLigne}
			aria-label={libelle}
			title={libelle}
			onClick={basculer}
		>
			<SearchIcon />
		</Button>
	)
}

type Props = Readonly<{
	colonnes: readonly ColonneListe[]
	prefixe: string
	chemin: string
	/** Paramètres actuels de l'URL, à conserver (autres listes, tri). */
	parametres: ParametresUrl
	/** Valeur actuelle de chaque filtre. */
	valeurs: Readonly<Record<string, string>>
}>

/**
 * Ligne de filtres sous les en-têtes d'une liste : zone de saisie (appliquée après une pause de
 * frappe) ou liste de choix (appliquée tout de suite) selon la colonne. Chaque changement remplace
 * l'URL (la page revient à 1) : le serveur relit la liste filtrée. Masquée, elle reste dans le
 * document (`hidden`), ce qui conserve une saisie en cours. Cellules ordinaires (et non d'en-tête) :
 * un lecteur d'écran n'annonce pas les filtres comme titres de colonne.
 */
export function FiltresColonnes({ colonnes, prefixe, chemin, parametres, valeurs }: Props) {
	const router = useRouter()
	const { visibles, idLigne } = useAffichageFiltres()

	function appliquer(cle: string, valeur: string | null) {
		router.replace(lienListe(chemin, parametres, prefixe, { [cle]: valeur }), { scroll: false })
	}

	return (
		<TableRow id={idLigne} hidden={!visibles} className="hover:bg-transparent">
			{colonnes.map((colonne) => (
				<TableCell key={colonne.cle} className={`py-1 ${colonne.classe ?? ""}`}>
					{/* Largeur nulle pour le calcul des colonnes, puis toute la cellule : afficher les
					    filtres ne change pas la largeur des colonnes, les champs s'y adaptent */}
					<div className="w-0 min-w-full">
						{colonne.filtre?.type === "texte" && (
							<FiltreTexte
								libelle={colonne.libelle}
								valeur={valeurs[colonne.cle] ?? ""}
								onAppliquer={(valeur) => appliquer(colonne.cle, valeur || null)}
							/>
						)}
						{colonne.filtre?.type === "choix" && (
							<FiltreChoix
								libelle={colonne.libelle}
								options={colonne.filtre.options}
								valeur={valeurs[colonne.cle] ?? ""}
								onAppliquer={(valeur) =>
									appliquer(
										colonne.cle,
										colonne.filtre?.type === "choix" &&
											valeur === (colonne.filtre.parDefaut ?? "")
											? null
											: valeur,
									)
								}
							/>
						)}
					</div>
				</TableCell>
			))}
			<TableCell />
		</TableRow>
	)
}

type PropsFiltre = Readonly<{
	libelle: string
	valeur: string
	onAppliquer: (valeur: string) => void
}>

function FiltreTexte({ libelle, valeur, onAppliquer }: PropsFiltre) {
	const [texte, setTexte] = useState(valeur)
	// Valeur de l'URL déjà prise en compte, et dernière valeur envoyée : une URL qui change sous l'effet
	// d'une autre action (effacement) remplace la saisie, mais pas le retour de notre propre envoi
	const [valeurConnue, setValeurConnue] = useState(valeur)
	const [envoyee, setEnvoyee] = useState(valeur)
	if (valeur !== valeurConnue) {
		setValeurConnue(valeur)
		if (valeur !== envoyee) {
			setTexte(valeur)
		}
	}

	useEffect(() => {
		const saisie = texte.trim()
		if (saisie === valeur) {
			return
		}
		const minuteur = setTimeout(() => {
			setEnvoyee(saisie)
			onAppliquer(saisie)
		}, DELAI_FILTRE_MS)
		return () => clearTimeout(minuteur)
	}, [texte, valeur, onAppliquer])

	return (
		<Input
			type="search"
			value={texte}
			onChange={(evenement) => setTexte(evenement.target.value)}
			maxLength={LONGUEUR_MAX_FILTRE}
			placeholder="Filtrer…"
			aria-label={`Filtrer par ${libelle.toLowerCase()}`}
			className="h-8 font-normal"
		/>
	)
}

function FiltreChoix({
	libelle,
	valeur,
	onAppliquer,
	options,
}: PropsFiltre & { options: readonly OptionFiltre[] }) {
	return (
		<Select
			value={valeur || VALEUR_SANS_FILTRE}
			onValueChange={(choix) => onAppliquer(choix === VALEUR_SANS_FILTRE ? "" : choix)}
		>
			<SelectTrigger
				size="sm"
				className="w-full min-w-0 font-normal"
				aria-label={`Filtrer par ${libelle.toLowerCase()}`}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.valeur} value={option.valeur || VALEUR_SANS_FILTRE}>
						{option.libelle}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
