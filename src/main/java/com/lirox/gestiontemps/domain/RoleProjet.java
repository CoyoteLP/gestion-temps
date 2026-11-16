package com.lirox.gestiontemps.domain;

import java.util.Set;

/**
 * Rôle d'un membre dans un projet. Tout membre voit le projet (tâches, membres, clôtures) et y saisit
 * son temps ; les responsables ({@link #RESPONSABLES}) consultent en plus les saisies des autres
 * membres et clôturent ses mois.
 */
public enum RoleProjet {

	/** Responsable du projet. */
	MANAGER,

	/** Remplaçant du responsable, avec les mêmes droits. */
	BACKUP,

	/** Contributeur : voit le projet et saisit son temps, sans voir les saisies des autres ni clôturer. */
	CONTRIBUTEUR;

	/** Rôles qui donnent accès aux saisies de tous les membres et à la clôture du projet. */
	public static final Set<RoleProjet> RESPONSABLES = Set.of(MANAGER, BACKUP);

}
