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
