/** Saisie refusée par l'API lors d'une recopie, avec le message de l'API. */
export type RefusRecopie = Readonly<{ jour: string; tacheId: number; message: string }>

/**
 * Résultat d'une recopie (préremplissage, recopie du lundi) : les saisies acceptées sont créées,
 * celles refusées sont listées. Une erreur empêche toute création (semaine plus vide, aucune fiche).
 */
export type CompteRenduRecopie =
	| Readonly<{ statut: "succes"; creees: number; refus: readonly RefusRecopie[] }>
	| Readonly<{ statut: "erreur"; message: string; identifiantCorrelation?: string }>
