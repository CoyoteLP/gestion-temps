package com.lirox.gestiontemps.dto;

import java.time.LocalDate;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.RoleProjet;

/**
 * Projet renvoyé par l'API.
 *
 * @param id          identifiant
 * @param version     version courante, à renvoyer pour modifier le projet
 * @param code        code court et unique
 * @param nom         nom du projet
 * @param description description libre
 * @param dateDebut   date de début prévue
 * @param dateFin     date de fin prévue
 * @param actif       false si le projet est désactivé
 * @param monRole     rôle de l'appelant dans le projet, null s'il n'en est pas membre
 * @param audit       date et auteur de la création et de la dernière modification
 */
public record ProjetResponse(
		Long id,
		long version,
		String code,
		String nom,
		String description,
		LocalDate dateDebut,
		LocalDate dateFin,
		boolean actif,
		RoleProjet monRole,
		AuditResponse audit) {

	/**
	 * @param projet entité à convertir
	 * @return la représentation API du projet, sans rôle de l'appelant
	 */
	public static ProjetResponse from(Projet projet) {
		return from(projet, null);
	}

	/**
	 * @param projet  entité à convertir
	 * @param monRole rôle de l'appelant dans le projet, null s'il n'en est pas membre
	 * @return la représentation API du projet
	 */
	public static ProjetResponse from(Projet projet, RoleProjet monRole) {
		return new ProjetResponse(projet.getId(), projet.getVersion(), projet.getCode(), projet.getNom(),
				projet.getDescription(), projet.getDateDebut(), projet.getDateFin(), projet.isActif(), monRole,
				AuditResponse.from(projet));
	}

}
