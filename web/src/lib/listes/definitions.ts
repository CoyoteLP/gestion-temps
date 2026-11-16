import { LIBELLES_ROLE_PROJET } from "@/lib/membres/schema-membre"

import type { DefinitionListe, OptionFiltre } from "./etat-liste"

/**
 * Colonnes des listes de l'application : clés identiques aux colonnes de tri et aux filtres de l'API
 * (`TriProjet`, `RechercheProjetsRequest`…). Les classes de visibilité sont reprises par les lignes.
 */

const statut = (tous: string, actifs: string, inactifs: string): readonly OptionFiltre[] => [
	{ valeur: "", libelle: tous },
	{ valeur: "actif", libelle: actifs },
	{ valeur: "inactif", libelle: inactifs },
]

export const LISTE_PROJETS: DefinitionListe = {
	prefixe: "",
	colonnes: [
		{ cle: "code", libelle: "Code", triable: true, filtre: { type: "texte" }, classe: "pl-4" },
		{ cle: "nom", libelle: "Nom", triable: true, filtre: { type: "texte" } },
		{ cle: "dateDebut", libelle: "Période", triable: true, classe: "hidden md:table-cell" },
		{ cle: "monRole", libelle: "Mon rôle", classe: "hidden sm:table-cell" },
		{
			cle: "actif",
			libelle: "Statut",
			triable: true,
			filtre: { type: "choix", options: statut("Tous", "Actifs", "Inactifs") },
		},
	],
}

/** Écran Utilisateurs : les comptes en attente de validation sont affichés par défaut. */
export const LISTE_UTILISATEURS: DefinitionListe = {
	prefixe: "",
	colonnes: [
		{ cle: "nom", libelle: "Nom", triable: true, filtre: { type: "texte" }, classe: "pl-4" },
		{
			cle: "email",
			libelle: "Email",
			triable: true,
			filtre: { type: "texte" },
			classe: "hidden md:table-cell",
		},
		{ cle: "creeLe", libelle: "Inscription", triable: true, classe: "hidden lg:table-cell" },
		{
			cle: "actif",
			libelle: "Statut",
			triable: true,
			filtre: {
				type: "choix",
				parDefaut: "inactif",
				options: [
					{ valeur: "inactif", libelle: "En attente" },
					{ valeur: "actif", libelle: "Actifs" },
					{ valeur: "tous", libelle: "Tous" },
				],
			},
		},
	],
}

export const LISTE_TACHES: DefinitionListe = {
	prefixe: "",
	colonnes: [
		{ cle: "libelle", libelle: "Libellé", triable: true, filtre: { type: "texte" }, classe: "pl-4" },
		{ cle: "description", libelle: "Description", classe: "hidden md:table-cell" },
		{
			cle: "actif",
			libelle: "Statut",
			triable: true,
			filtre: { type: "choix", options: statut("Toutes", "Actives", "Inactives") },
		},
	],
}

/**
 * Mois clôturés d'un projet, sur sa fiche : ordre imposé par l'API (plus récent d'abord), sans
 * filtre. La date et l'auteur de la clôture (audit) ne sont renvoyés qu'à l'administrateur : leur
 * colonne n'existe que pour lui.
 *
 * @param estAdmin vrai pour un administrateur
 * @returns la définition de la liste
 */
export function listeClotures(estAdmin: boolean): DefinitionListe {
	return {
		prefixe: "clotures.",
		colonnes: [
			{ cle: "mois", libelle: "Mois", classe: "pl-4" },
			...(estAdmin ? [{ cle: "creeLe", libelle: "Clôturé le", classe: "hidden sm:table-cell" }] : []),
		],
	}
}

/**
 * Saisies du mois d'un projet (page Équipe) : ordre imposé par l'API (par jour), filtres par membre
 * et par tâche (`utilisateurId`, `tacheId` de l'API). Les options dépendent du projet.
 *
 * @param membres membres et anciens auteurs de saisies : identifiant et nom
 * @param taches  tâches du projet (désactivées comprises) : identifiant et libellé
 * @returns la définition de la liste
 */
export function listeSaisiesEquipe(
	membres: readonly Readonly<{ utilisateurId: number; nom: string }>[],
	taches: readonly Readonly<{ id: number; libelle: string }>[],
): DefinitionListe {
	return {
		prefixe: "saisies.",
		colonnes: [
			{ cle: "jour", libelle: "Jour", classe: "pl-4" },
			{
				cle: "utilisateurId",
				libelle: "Membre",
				filtre: {
					type: "choix",
					options: [
						{ valeur: "", libelle: "Tous" },
						...membres.map((membre) => ({
							valeur: String(membre.utilisateurId),
							libelle: membre.nom,
						})),
					],
				},
			},
			{
				cle: "tacheId",
				libelle: "Tâche",
				filtre: {
					type: "choix",
					options: [
						{ valeur: "", libelle: "Toutes" },
						...taches.map((tache) => ({ valeur: String(tache.id), libelle: tache.libelle })),
					],
				},
				classe: "hidden md:table-cell",
			},
			{ cle: "duree", libelle: "Durée", classe: "text-right" },
			{ cle: "commentaire", libelle: "Commentaire", classe: "hidden lg:table-cell" },
		],
	}
}

/**
 * Synthèse du mois par projet (administrateur, page Équipe) : ordre imposé par l'API (par code),
 * filtres par code ou nom du projet et par clôture du mois.
 */
export const LISTE_SYNTHESE: DefinitionListe = {
	prefixe: "synthese.",
	colonnes: [
		{ cle: "projet", libelle: "Projet", filtre: { type: "texte" }, classe: "pl-4" },
		{
			cle: "cloture",
			libelle: "Statut",
			filtre: {
				type: "choix",
				options: [
					{ valeur: "", libelle: "Tous" },
					{ valeur: "ouvert", libelle: "Ouverts" },
					{ valeur: "cloture", libelle: "Clôturés" },
				],
			},
		},
		{ cle: "totalHeures", libelle: "Total", classe: "text-right" },
	],
}

/** Membres d'un projet : sur la fiche, à côté des tâches, d'où le préfixe de leurs paramètres. */
export const LISTE_MEMBRES: DefinitionListe = {
	prefixe: "membres.",
	colonnes: [
		{ cle: "nom", libelle: "Nom", triable: true, filtre: { type: "texte" }, classe: "pl-4" },
		{
			cle: "email",
			libelle: "Email",
			triable: true,
			filtre: { type: "texte" },
			classe: "hidden md:table-cell",
		},
		{
			cle: "role",
			libelle: "Rôle",
			triable: true,
			filtre: {
				type: "choix",
				options: [
					{ valeur: "", libelle: "Tous" },
					...Object.entries(LIBELLES_ROLE_PROJET).map(([valeur, libelle]) => ({ valeur, libelle })),
				],
			},
		},
	],
}
