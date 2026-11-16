import "server-only"

import { lireClotureDuMois } from "@/lib/api/clotures"
import { listerTousLesMembres } from "@/lib/api/membres"
import type { Cloture, MembreProjet, Projet, Saisie, SyntheseMois, Tache } from "@/lib/api/modeles"
import { lireSyntheseDuMois, listerTousLesProjets } from "@/lib/api/projets"
import { listerSaisiesDuProjet, rechercherSaisiesDuProjet } from "@/lib/api/saisies"
import { listerToutesLesTachesDuProjet } from "@/lib/api/taches"
import type { PageResponse } from "@/lib/api/types"
import { lireIdentifiant } from "@/lib/identifiant"
import { LISTE_SYNTHESE } from "@/lib/listes/definitions"
import { lireEtatListe, type ParametresUrl } from "@/lib/listes/etat-liste"
import { lirePage } from "@/lib/pagination"

import type { Mois } from "./mois"
import { projetsPourEquipe } from "./recapitulatif"

/** Préfixe des paramètres du détail des saisies dans l'URL (`saisies.page`, `saisies.utilisateurId`). */
export const PREFIXE_SAISIES = "saisies."

/** Données de la page Équipe pour un projet et un mois. */
export type DonneesEquipe = Readonly<{
	/** Synthèse du mois par projet et total général, pour l'administrateur seulement (null sinon). */
	synthese: SyntheseMois | null
	/** Projets proposés (responsable ou suppléant ; tous pour l'administrateur). */
	projets: readonly Projet[]
	/** Projet affiché ; null si aucun n'est proposé. */
	projet: Projet | null
	membres: readonly MembreProjet[]
	taches: readonly Tache[]
	/** Toutes les saisies du mois du projet, pour le récapitulatif. */
	saisies: readonly Saisie[]
	/** Page du détail, filtrée par membre et par tâche si l'URL le demande. */
	detail: PageResponse<Saisie> | null
	/** Membre filtré dans le détail (identifiant lu dans l'URL), ou null. */
	membreFiltre: number | null
	/** Tâche filtrée dans le détail (identifiant lu dans l'URL), ou null. */
	tacheFiltre: number | null
	cloture: Cloture | null
}>

const premiere = (valeur: string | string[] | undefined) => (Array.isArray(valeur) ? valeur[0] : valeur)

/**
 * Lit les projets proposés (et, pour l'administrateur, la synthèse du mois en même temps), puis, en
 * parallèle, pour le projet choisi (`?projet=`, le premier proposé sinon) : ses membres, ses tâches, les saisies du mois, la page du détail et la clôture du mois.
 *
 * @param mois       mois affiché
 * @param parametres paramètres de l'URL (projet ; page et filtres de la synthèse et du détail)
 * @param estAdmin   vrai pour un administrateur (tous les projets proposés)
 * @returns les données de la page
 * @throws ApiError si une lecture échoue (403 si l'appelant a perdu son rôle entre-temps)
 */
export async function lireDonneesEquipe(
	mois: Mois,
	parametres: ParametresUrl,
	estAdmin: boolean,
): Promise<DonneesEquipe> {
	const [tousLesProjets, synthese] = await Promise.all([
		listerTousLesProjets(),
		estAdmin ? lireSyntheseDuMois(mois.mois, lireEtatListe(LISTE_SYNTHESE, parametres)) : null,
	])
	const projets = projetsPourEquipe(tousLesProjets, estAdmin)
	const demande = lireIdentifiant(premiere(parametres.projet))
	const projet = projets.find((candidat) => candidat.id === demande) ?? projets[0] ?? null
	if (!projet) {
		return {
			synthese,
			projets,
			projet: null,
			membres: [],
			taches: [],
			saisies: [],
			detail: null,
			membreFiltre: null,
			tacheFiltre: null,
			cloture: null,
		}
	}
	const membreFiltre = lireIdentifiant(premiere(parametres[`${PREFIXE_SAISIES}utilisateurId`]))
	const tacheFiltre = lireIdentifiant(premiere(parametres[`${PREFIXE_SAISIES}tacheId`]))
	const page = lirePage(premiere(parametres[`${PREFIXE_SAISIES}page`]))
	const [membres, taches, saisies, detail, cloture] = await Promise.all([
		listerTousLesMembres(projet.id),
		listerToutesLesTachesDuProjet(projet.id),
		listerSaisiesDuProjet(projet.id, mois.premierJour, mois.dernierJour),
		rechercherSaisiesDuProjet(projet.id, mois.premierJour, mois.dernierJour, page, {
			utilisateurId: membreFiltre ?? undefined,
			tacheId: tacheFiltre ?? undefined,
		}),
		lireClotureDuMois(projet.id, mois.mois),
	])
	return {
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
	}
}
