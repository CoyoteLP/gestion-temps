/**
 * Résultat d'une Server Action, affiché par le composant qui l'a appelée.
 *
 * @typeParam Champ champs du formulaire auxquels une erreur de validation peut être rattachée
 */
export type EtatAction<Champ extends string = string> =
	| { statut: "initial" }
	/** `id` : ressource créée, quand le composant doit l'ouvrir. */
	| { statut: "succes"; id?: number }
	/** Saisie invalide : un message par champ en cause. */
	| { statut: "invalide"; erreurs: Partial<Record<Champ, string>> }
	/** Ressource modifiée entre-temps (409) : à recharger avant de recommencer. */
	| { statut: "conflit"; message: string }
	| { statut: "erreur"; message: string; identifiantCorrelation?: string }

export const ETAT_INITIAL: EtatAction<never> = { statut: "initial" }
