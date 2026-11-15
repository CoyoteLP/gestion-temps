package com.lirox.gestiontemps.dto;

import java.math.BigDecimal;

/**
 * Synthèse d'un projet pour un mois (administrateur) : total des heures saisies et clôture du mois.
 * Projection calculée en une requête par {@code ProjetRepository.syntheseDuMois}, pas une entité :
 * elle n'a ni version ni audit.
 *
 * @param projetId    identifiant du projet
 * @param code        code du projet
 * @param nom         nom du projet
 * @param actif       vrai si le projet est actif
 * @param totalHeures total des saisies du mois sur le projet, en heures (0 sans saisie)
 * @param clotureId   identifiant de la clôture du mois (pour la rouvrir), null si le mois est ouvert
 */
public record SyntheseProjetResponse(
		Long projetId,
		String code,
		String nom,
		boolean actif,
		BigDecimal totalHeures,
		Long clotureId) {

	/** Sans saisie dans le mois, la somme vaut null en SQL : elle est ramenée à 0. */
	public SyntheseProjetResponse {
		totalHeures = totalHeures == null ? BigDecimal.ZERO : totalHeures;
	}

}
