import { UnlinkIcon, UserXIcon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { BoutonActivation } from "@/components/bouton-activation"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { TableauListe } from "@/components/tableau-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerUtilisateurs } from "@/lib/api/utilisateurs"
import { formaterDate, nomComplet } from "@/lib/format"
import { LISTE_UTILISATEURS } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { changerActivationAction, reinitialiserRattachementAction } from "@/lib/utilisateurs/actions"

type Props = Readonly<{
	/** Paramètres de l'URL : page, tri et filtres (statut « en attente » par défaut). */
	parametres: ParametresUrl
}>

/**
 * Comptes utilisateurs, triables et filtrables (en attente de validation par défaut), avec leur
 * activation, leur désactivation et la réinitialisation de leur rattachement (administrateur). Lit
 * l'API : à placer dans un `<Suspense>`.
 */
export async function ListeUtilisateurs({ parametres }: Props) {
	const etat = lireEtatListe(LISTE_UTILISATEURS, parametres)
	const utilisateurs = await valeurOuErreurApi(listerUtilisateurs(etat))
	if (utilisateurs instanceof ApiError) {
		return (
			<AlerteErreur
				message={utilisateurs.message}
				identifiantCorrelation={utilisateurs.identifiantCorrelation}
			/>
		)
	}

	return (
		<TableauListe
			definition={LISTE_UTILISATEURS}
			etat={etat}
			chemin="/utilisateurs"
			parametres={parametres}
			page={utilisateurs}
			libelles={{ un: "utilisateur", plusieurs: "utilisateurs" }}
			messages={{
				vide: etat.filtres.actif === "inactif" ? "Aucun compte en attente." : "Aucun utilisateur.",
				aucunResultat: "Aucun utilisateur ne correspond aux filtres.",
			}}
		>
			{utilisateurs.contenu.map((utilisateur) => {
				const nom = nomComplet(utilisateur)
				return (
					<TableRow key={utilisateur.id}>
						<TableCell className="pl-4 font-medium">{nom}</TableCell>
						<TableCell className="hidden text-muted-foreground md:table-cell">
							{utilisateur.email}
						</TableCell>
						<TableCell className="hidden text-muted-foreground lg:table-cell">
							{utilisateur.audit ? formaterDate(utilisateur.audit.creeLe) : null}
						</TableCell>
						<TableCell>
							{utilisateur.actif ? (
								<Badge variant="secondary">Actif</Badge>
							) : (
								<Badge variant="outline">Inactif</Badge>
							)}
						</TableCell>
						<TableCell className="space-x-1 pr-4 text-right whitespace-nowrap">
							{utilisateur.rattache && (
								<DialogueConfirmation
									titre="Réinitialiser le rattachement ?"
									description={`Le compte de connexion de ${nom} sera détaché de sa fiche ; elle sera reprise par le prochain compte qui se connectera avec l'email ${utilisateur.email}, vérifié par le service de connexion. À utiliser quand son compte a été recréé.`}
									libelleConfirmation="Réinitialiser"
									messageSucces={`Le rattachement du compte de ${nom} est réinitialisé.`}
									action={reinitialiserRattachementAction.bind(null, utilisateur.id)}
									declencheur={
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Réinitialiser le rattachement du compte de ${nom}`}
											title="Réinitialiser le rattachement du compte"
										>
											<UnlinkIcon />
										</Button>
									}
								/>
							)}
							{utilisateur.actif ? (
								<DialogueConfirmation
									titre="Désactiver ce compte ?"
									description={`${nom} n'aura plus accès aux projets ni aux saisies, jusqu'à une nouvelle activation. Ses saisies de temps sont conservées.`}
									libelleConfirmation="Désactiver"
									messageSucces={`Le compte de ${nom} est désactivé.`}
									action={changerActivationAction.bind(
										null,
										utilisateur.id,
										false,
										utilisateur.version,
									)}
									declencheur={
										<Button variant="outline" size="sm">
											<UserXIcon /> Désactiver
										</Button>
									}
								/>
							) : (
								<BoutonActivation
									nom={nom}
									action={changerActivationAction.bind(
										null,
										utilisateur.id,
										true,
										utilisateur.version,
									)}
								/>
							)}
						</TableCell>
					</TableRow>
				)
			})}
		</TableauListe>
	)
}
