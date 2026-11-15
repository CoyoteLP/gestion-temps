import { AlerteErreur } from "@/components/alerte-erreur"
import { Encadre } from "@/components/message"
import { NavigationMois } from "@/components/navigation-mois"
import { RecapitulatifMois } from "@/components/recapitulatif-mois"
import { SelectionProjetEquipe } from "@/components/selection-projet-equipe"
import { StatutMois } from "@/components/statut-mois"
import { SyntheseMois } from "@/components/synthese-mois"
import { TableauListe } from "@/components/tableau-liste"
import { TableCell, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { lireDonneesEquipe } from "@/lib/equipe/donnees"
import type { Mois } from "@/lib/equipe/mois"
import { calculerRecapitulatif, libelleAncienMembre } from "@/lib/equipe/recapitulatif"
import { formaterDuree, formaterJourCourt, formaterJourLong } from "@/lib/format"
import { listeSaisiesEquipe } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"

type Props = Readonly<{
	mois: Mois
	dateDuJour: string
	parametres: ParametresUrl
	estAdmin: boolean
}>

/**
 * Saisies de l'équipe d'un projet pour un mois, en lecture : choix du mois, synthèse de tous les
 * projets (administrateur), choix du projet, statut du mois (et sa clôture), récapitulatif, détail
 * paginé filtrable par membre. Lit l'API : à placer dans
 * un `<Suspense>`.
 */
export async function VueEquipe({ mois, dateDuJour, parametres, estAdmin }: Props) {
	const donnees = await valeurOuErreurApi(lireDonneesEquipe(mois, parametres, estAdmin))
	if (donnees instanceof ApiError) {
		return (
			<AlerteErreur message={donnees.message} identifiantCorrelation={donnees.identifiantCorrelation} />
		)
	}
	const {
		synthese,
		projets,
		projet,
		membres,
		taches,
		saisies,
		detail,
		membreFiltre,
		tacheFiltre,
		cloture,
	} = donnees
	if (!projet || !detail) {
		return (
			<Encadre niveau="information" titre="Aucun projet à suivre">
				La vue Équipe est réservée aux responsables et suppléants d&apos;un projet : elle montre les
				saisies de ses membres et permet d&apos;en clôturer les mois.
			</Encadre>
		)
	}

	const libelles = new Map(taches.map((tache) => [tache.id, tache.libelle]))
	const libelleTache = (id: number) => libelles.get(id) ?? `Tâche n° ${id}`
	const recapitulatif = calculerRecapitulatif(saisies, membres, libelleTache)
	const noms = new Map(recapitulatif.parMembre.map((membre) => [membre.utilisateurId, membre.nom]))
	// Un membre filtré dans l'URL sans saisie ni appartenance au projet reste choisi dans le filtre
	const choixMembres =
		membreFiltre === null || noms.has(membreFiltre)
			? recapitulatif.parMembre
			: [
					...recapitulatif.parMembre,
					{ utilisateurId: membreFiltre, nom: `Utilisateur n° ${membreFiltre}` },
				]
	// De même pour une tâche filtrée qui n'est plus lisible
	const choixTaches =
		tacheFiltre === null || libelles.has(tacheFiltre)
			? taches
			: [...taches, { id: tacheFiltre, libelle: libelleTache(tacheFiltre) }]
	const definition = listeSaisiesEquipe(choixMembres, choixTaches)
	const etat = lireEtatListe(definition, parametres)
	const chemin = `/equipe`

	return (
		<>
			<NavigationMois mois={mois} dateDuJour={dateDuJour} projetId={projet.id} />
			{synthese && (
				<SyntheseMois
					synthese={synthese}
					mois={mois.mois}
					dateDuJour={dateDuJour}
					parametres={parametres}
				/>
			)}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<SelectionProjetEquipe
					projets={projets.map(({ id, code, nom }) => ({ id, code, nom }))}
					projetId={projet.id}
					mois={mois.mois}
				/>
				<StatutMois
					projet={projet}
					mois={mois.mois}
					cloture={cloture}
					dateDuJour={dateDuJour}
					estAdmin={estAdmin}
				/>
			</div>
			<RecapitulatifMois recapitulatif={recapitulatif} />
			<section className="flex flex-col gap-2" aria-labelledby="titre-detail">
				<h2 id="titre-detail" className="text-lg font-semibold">
					Détail des saisies
				</h2>
				<TableauListe
					definition={definition}
					etat={etat}
					chemin={chemin}
					parametres={parametres}
					page={detail}
					libelles={{ un: "saisie", plusieurs: "saisies" }}
					messages={{
						vide: "Aucune saisie ce mois-ci.",
						aucunResultat: "Aucune saisie de ce membre ce mois-ci.",
					}}
				>
					{detail.contenu.map((saisie) => (
						<TableRow key={saisie.id}>
							<TableCell
								className="pl-4 whitespace-nowrap"
								title={formaterJourLong(saisie.jour)}
							>
								{formaterJourCourt(saisie.jour)}
							</TableCell>
							<TableCell className="font-medium">
								{noms.get(saisie.utilisateurId) ?? libelleAncienMembre(saisie.utilisateurId)}
							</TableCell>
							<TableCell className="hidden md:table-cell">
								{libelleTache(saisie.tacheId)}
							</TableCell>
							<TableCell className="text-right tabular-nums">
								{formaterDuree(saisie.duree)}
							</TableCell>
							<TableCell className="hidden max-w-64 truncate text-muted-foreground lg:table-cell">
								{saisie.commentaire}
							</TableCell>
							<TableCell />
						</TableRow>
					))}
				</TableauListe>
			</section>
		</>
	)
}
