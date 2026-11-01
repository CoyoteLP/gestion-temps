package com.lirox.gestiontemps.domain;

/**
 * Rôle d'un membre dans un projet. Tous les rôles donnent aujourd'hui les mêmes droits sur le
 * projet (consultation de ses saisies, clôture) ; la liste est appelée à s'enrichir.
 */
public enum RoleProjet {

	/** Responsable du projet. */
	MANAGER,

	/** Remplaçant du responsable. */
	BACKUP

}
