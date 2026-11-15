import { CalendarArrowDownIcon, CopyIcon, PlusIcon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { BoutonRecopie } from "@/components/bouton-recopie"
import { DialogueSaisie } from "@/components/dialogue-saisie"
import { GrilleSemaine } from "@/components/grille-semaine"
import { ListeSaisiesSemaine } from "@/components/liste-saisies-semaine"
import { NavigationSemaine } from "@/components/navigation-semaine"
import { Encadre } from "@/components/message"
import { Button } from "@/components/ui/button"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { preremplirSemaineAction, recopierLundiAction } from "@/lib/saisies/actions"
import { lireDonneesSemaine } from "@/lib/saisies/donnees"
import {
	calculerGrille,
	cumulDeLaSemaine,
	estCloture,
	moisClotures,
	saisiesAPreremplir,
	saisiesARecopierDuLundi,
} from "@/lib/saisies/grille"
import {
	libellesDesTaches,
	type OptionsSaisie,
	projetsPourSaisie,
	tachesPourSaisie,
} from "@/lib/saisies/options"
import { joursAffiches, type Semaine } from "@/lib/saisies/semaine"

type Props = Readonly<{
	semaine: Semaine
	/** Date du jour à Paris (`AAAA-MM-JJ`). */
	dateDuJour: string
}>

const pluriel = (nombre: number) => `${nombre} saisie${nombre > 1 ? "s" : ""}`

/**
 * Semaine de saisies de l'utilisateur connecté : navigation, recopies, grille et liste. Lit l'API :
 * à placer dans un `<Suspense>`.
 */
export async function SemaineSaisies({ semaine, dateDuJour }: Props) {
	const donnees = await valeurOuErreurApi(lireDonneesSemaine(semaine))
	if (donnees instanceof ApiError) {
		return (
			<AlerteErreur message={donnees.message} identifiantCorrelation={donnees.identifiantCorrelation} />
		)
	}
	if (!donnees.moi) {
		return (
			<Encadre niveau="information" titre="Saisie des temps indisponible">
				Votre compte administrateur n&apos;a pas de fiche utilisateur : la saisie des temps est
				réservée aux utilisateurs.
			</Encadre>
		)
	}

	const projets = projetsPourSaisie(donnees.projets)
	const taches = tachesPourSaisie(donnees.taches)
	const libelleTache = libellesDesTaches(projets, taches)
	const projetDeTache = new Map(taches.map((tache) => [tache.id, tache.projetId]))
	const clotures = moisClotures(donnees.clotures)
	const grille = calculerGrille(donnees.saisies, libelleTache)
	const jours = joursAffiches(semaine, new Set(donnees.saisies.map((saisie) => saisie.jour)))
	const projetsMembres = donnees.projets.filter((projet) => projet.monRole !== null)
	const joursClos = new Set(
		semaine.jours.filter(
			(jour) =>
				projetsMembres.length > 0 &&
				projetsMembres.every((projet) => estCloture(clotures, projet.id, jour)),
		),
	)
	const peutSaisir = projets.some((projet) => projet.ouvert)
	const options: OptionsSaisie | null = peutSaisir
		? {
				projets,
				taches,
				cumulParJour: cumulDeLaSemaine(semaine, grille.totauxParJour),
				clotures: [...clotures],
			}
		: null
	const libellesTaches = Object.fromEntries(taches.map((tache) => [tache.id, libelleTache(tache.id)]))
	const aPreremplir = saisiesAPreremplir(donnees.saisiesPrecedentes).length
	const aRecopier = saisiesARecopierDuLundi(semaine, donnees.saisies).length
	const jourParDefaut = semaine.jours.includes(dateDuJour) ? dateDuJour : semaine.lundi

	return (
		<>
			<NavigationSemaine semaine={semaine} dateDuJour={dateDuJour} />
			{!peutSaisir && (
				<Encadre niveau="information" titre="Aucun projet ouvert à la saisie">
					Vous n&apos;êtes membre d&apos;aucun projet actif : demandez à un administrateur de vous y
					ajouter.
				</Encadre>
			)}
			{options && (
				<div className="flex flex-wrap gap-2">
					<DialogueSaisie
						options={options}
						jourParDefaut={jourParDefaut}
						declencheur={
							<Button size="sm">
								<PlusIcon /> Nouvelle saisie
							</Button>
						}
					/>
					{donnees.saisies.length === 0 && aPreremplir > 0 && (
						<BoutonRecopie
							libelle="Préremplir depuis la semaine précédente"
							icone={<CalendarArrowDownIcon />}
							titre="Préremplir la semaine ?"
							description={`${pluriel(aPreremplir)} de la semaine précédente ${aPreremplir > 1 ? "vont être recréées" : "va être recréée"} le même jour de la semaine, avec la même tâche, la même durée et le même commentaire. Celles que l'API refuse (mois clôturé, tâche désactivée…) seront listées.`}
							action={preremplirSemaineAction.bind(null, semaine.lundi)}
							libellesTaches={libellesTaches}
						/>
					)}
					{aRecopier > 0 && (
						<BoutonRecopie
							libelle="Recopier le lundi sur la semaine"
							icone={<CopyIcon />}
							titre="Recopier le lundi ?"
							description={`Les saisies du lundi vont être recopiées sur chaque jour encore vide du mardi au vendredi (${pluriel(aRecopier)} au total). Le week-end n'est pas touché ; celles que l'API refuse seront listées.`}
							action={recopierLundiAction.bind(null, semaine.lundi)}
							libellesTaches={libellesTaches}
						/>
					)}
				</div>
			)}
			<GrilleSemaine
				grille={grille}
				jours={jours}
				dateDuJour={dateDuJour}
				joursClos={joursClos}
				options={options}
			/>
			<ListeSaisiesSemaine
				saisies={donnees.saisies}
				libelleTache={libelleTache}
				estClose={(saisie) => {
					const projetId = projetDeTache.get(saisie.tacheId)
					return projetId !== undefined && estCloture(clotures, projetId, saisie.jour)
				}}
				options={options}
			/>
		</>
	)
}
