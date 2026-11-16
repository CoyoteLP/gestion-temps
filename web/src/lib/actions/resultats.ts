import "server-only"

import type { z } from "zod"

import { ApiError } from "@/lib/api/erreurs"

import type { EtatAction } from "./etat-action"

/** Identifiant ou version reçus par une Server Action, incohérents avec la page affichée. */
export const MESSAGE_DONNEES_INVALIDES = "Données de la page invalides : rechargez-la avant de recommencer."

/**
 * Traduit une erreur de l'API en état affichable : 409 → conflit (ressource modifiée entre-temps,
 * ou refus lié à l'état des données, que le message de l'API explique) ; autre statut → erreur avec
 * sa référence.
 *
 * @param erreur erreur levée par un appel à l'API
 * @returns l'état à afficher
 * @throws l'erreur elle-même si elle ne vient pas de l'API (erreur de programmation, redirection)
 */
export function etatErreur(erreur: unknown): EtatAction<never> {
	if (!(erreur instanceof ApiError)) {
		throw erreur
	}
	if (erreur.statut === 409) {
		return { statut: "conflit", message: erreur.message }
	}
	return {
		statut: "erreur",
		message: erreur.message,
		identifiantCorrelation: erreur.identifiantCorrelation,
	}
}

/**
 * @param erreur erreur de validation zod d'un formulaire
 * @returns l'état « invalide », avec le premier message de chaque champ en cause
 */
export function etatInvalide<Champ extends string>(erreur: z.ZodError): EtatAction<Champ> {
	const erreurs: Partial<Record<Champ, string>> = {}
	for (const probleme of erreur.issues) {
		const champ = probleme.path[0] as Champ
		erreurs[champ] ??= probleme.message
	}
	return { statut: "invalide", erreurs }
}

/** @returns l'état d'erreur renvoyé quand l'identifiant ou la version reçus sont incohérents */
export function etatDonneesInvalides(): EtatAction<never> {
	return { statut: "erreur", message: MESSAGE_DONNEES_INVALIDES }
}

/**
 * Une Server Action est appelable directement, sans passer par la page : ses arguments sont vérifiés.
 *
 * @param valeur identifiant reçu
 * @returns vrai pour un entier strictement positif
 */
export function identifiantValide(valeur: unknown): valeur is number {
	return Number.isSafeInteger(valeur) && (valeur as number) > 0
}

/**
 * @param valeur version reçue (verrouillage optimiste)
 * @returns vrai pour un entier positif ou nul
 */
export function versionValide(valeur: unknown): valeur is number {
	return Number.isSafeInteger(valeur) && (valeur as number) >= 0
}
