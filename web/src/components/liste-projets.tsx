import { PencilIcon } from "lucide-react"
import Link from "next/link"

import { AlerteErreur } from "@/components/alerte-erreur"
import { TableauListe } from "@/components/tableau-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerProjets } from "@/lib/api/projets"
import { formaterPeriode } from "@/lib/format"
import { LISTE_PROJETS } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { LIBELLES_ROLE_PROJET } from "@/lib/membres/schema-membre"

type Props = Readonly<{
	/** Paramètres de l'URL : page, tri et filtres de la liste. */
	parametres: ParametresUrl
	/** Ajoute l'accès direct à la modification (l'API la réserve à l'administrateur). */
	estAdmin: boolean
}>

/**
 * Liste paginée, triable et filtrable des projets ; le nom ouvre la fiche du projet. Lit l'API : à
 * placer dans un `<Suspense>`.
 */
export async function ListeProjets({ parametres, estAdmin }: Props) {
	const etat = lireEtatListe(LISTE_PROJETS, parametres)
	const projets = await valeurOuErreurApi(listerProjets(etat))
	if (projets instanceof ApiError) {
		return (
			<AlerteErreur message={projets.message} identifiantCorrelation={projets.identifiantCorrelation} />
		)
	}

	return (
		<TableauListe
			definition={LISTE_PROJETS}
			etat={etat}
			chemin="/projets"
			parametres={parametres}
			page={projets}
			libelles={{ un: "projet", plusieurs: "projets" }}
			messages={{ vide: "Aucun projet.", aucunResultat: "Aucun projet ne correspond aux filtres." }}
		>
			{projets.contenu.map((projet) => (
				<TableRow key={projet.id}>
					<TableCell className="pl-4 font-mono text-sm">{projet.code}</TableCell>
					<TableCell className="font-medium">
						<Link href={`/projets/${projet.id}`} className="underline-offset-4 hover:underline">
							{projet.nom}
						</Link>
					</TableCell>
					<TableCell className="hidden text-muted-foreground md:table-cell">
						{formaterPeriode(projet.dateDebut, projet.dateFin)}
					</TableCell>
					<TableCell className="hidden sm:table-cell">
						{projet.monRole && LIBELLES_ROLE_PROJET[projet.monRole]}
					</TableCell>
					<TableCell>
						{projet.actif ? (
							<Badge variant="secondary">Actif</Badge>
						) : (
							<Badge variant="outline">Inactif</Badge>
						)}
					</TableCell>
					<TableCell className="pr-4 text-right">
						{estAdmin && (
							<Button variant="ghost" size="icon-sm" asChild>
								<Link
									href={`/projets/${projet.id}/modifier`}
									aria-label={`Modifier le projet ${projet.nom}`}
								>
									<PencilIcon />
								</Link>
							</Button>
						)}
					</TableCell>
				</TableRow>
			))}
		</TableauListe>
	)
}
