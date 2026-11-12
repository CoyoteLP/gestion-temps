import type { Profil } from "./schema-profil"

/** Résultat d'une action sur le compte, affiché par le formulaire qui l'a appelée. */
export type EtatAction =
	| { statut: "initial" }
	| { statut: "succes" }
	/** Profil invalide : un message par champ en cause. */
	| { statut: "invalide"; erreurs: Partial<Record<keyof Profil, string>> }
	/** Fiche modifiée entre-temps (409) : à recharger avant de recommencer. */
	| { statut: "conflit"; message: string }
	| { statut: "erreur"; message: string; identifiantCorrelation?: string }

export const ETAT_INITIAL: EtatAction = { statut: "initial" }
