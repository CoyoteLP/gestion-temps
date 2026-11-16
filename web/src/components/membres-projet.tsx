import { PencilIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { type ChoixUtilisateur, DialogueMembre } from "@/components/dialogue-membre"
import { TableauListe } from "@/components/tableau-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { formaterUtilisateur, nomComplet } from "@/lib/format"
import { LISTE_MEMBRES } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { retirerMembreAction } from "@/lib/membres/actions"
import { lireMembresDuProjet } from "@/lib/membres/membres-du-projet"
import { LIBELLES_ROLE_PROJET } from "@/lib/membres/schema-membre"

type Props = Readonly<{
	projetId: number
	/** Paramètres de l'URL de la fiche : page, tri et filtres des membres (préfixe `membres.`). */
	parametres: ParametresUrl
}>

/**
 * Membres d'un projet et leur rôle, paginés, triables et filtrables ; réservés à l'administrateur
 * (seul à pouvoir lire les noms et modifier la liste). Lit l'API : à placer dans un `<Suspense>`.
 */
export async function MembresProjet({ projetId, parametres }: Props) {
	const etat = lireEtatListe(LISTE_MEMBRES, parametres)
	const resultat = await valeurOuErreurApi(lireMembresDuProjet(projetId, etat))
	if (resultat instanceof ApiError) {
		return (
			<AlerteErreur
				titre="Impossible d'afficher les membres"
				message={resultat.message}
				identifiantCorrelation={resultat.identifiantCorrelation}
			/>
		)
	}
	const { membres, candidats } = resultat
	const choix: ChoixUtilisateur[] = candidats.map((fiche) => ({
		id: fiche.id,
		libelle: formaterUtilisateur(fiche),
	}))

	return (
		<section className="flex flex-col gap-2" aria-labelledby="titre-membres">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h2 id="titre-membres" className="text-lg font-semibold">
						Membres
					</h2>
					<p className="text-sm text-muted-foreground">
						Seuls les membres voient le projet et y saisissent leur temps ; responsables et
						suppléants consultent aussi les saisies de tous et clôturent les mois.
					</p>
				</div>
				<DialogueMembre
					mode="ajout"
					projetId={projetId}
					candidats={choix}
					declencheur={
						<Button size="sm">
							<UserPlusIcon /> Ajouter un membre
						</Button>
					}
				/>
			</div>
			<TableauListe
				definition={LISTE_MEMBRES}
				etat={etat}
				chemin={`/projets/${projetId}`}
				parametres={parametres}
				page={membres}
				libelles={{ un: "membre", plusieurs: "membres" }}
				messages={{ vide: "Aucun membre.", aucunResultat: "Aucun membre ne correspond aux filtres." }}
			>
				{membres.contenu.map((membre) => {
					const nom = membre.utilisateur
						? nomComplet(membre.utilisateur)
						: `Utilisateur n° ${membre.utilisateurId}`
					return (
						<TableRow key={membre.id}>
							<TableCell className="pl-4 font-medium">
								{nom}
								{membre.utilisateur && !membre.utilisateur.actif && (
									<Badge variant="outline" className="ml-2">
										Inactif
									</Badge>
								)}
							</TableCell>
							<TableCell className="hidden text-muted-foreground md:table-cell">
								{membre.utilisateur?.email}
							</TableCell>
							<TableCell>{LIBELLES_ROLE_PROJET[membre.role]}</TableCell>
							<TableCell className="pr-4 text-right whitespace-nowrap">
								<DialogueMembre
									mode="modification"
									projetId={projetId}
									membre={{
										id: membre.id,
										version: membre.version,
										role: membre.role,
										utilisateur: {
											id: membre.utilisateurId,
											libelle: membre.utilisateur
												? formaterUtilisateur(membre.utilisateur)
												: nom,
										},
									}}
									declencheur={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Modifier le rôle de ${nom}`}
										>
											<PencilIcon />
										</Button>
									}
								/>
								<DialogueConfirmation
									titre="Retirer ce membre ?"
									description={`${nom} ne sera plus membre du projet ; ses saisies de temps sont conservées.`}
									libelleConfirmation="Retirer"
									messageSucces="Le membre a été retiré du projet."
									action={retirerMembreAction.bind(null, projetId, membre.id)}
									declencheur={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Retirer ${nom} du projet`}
										>
											<UserMinusIcon />
										</Button>
									}
								/>
							</TableCell>
						</TableRow>
					)
				})}
			</TableauListe>
		</section>
	)
}
