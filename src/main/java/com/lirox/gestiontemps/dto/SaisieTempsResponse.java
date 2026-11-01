package com.lirox.gestiontemps.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lirox.gestiontemps.domain.SaisieTemps;

/**
 * Saisie de temps renvoyée par l'API.
 *
 * @param id            identifiant
 * @param utilisateurId utilisateur ayant effectué le travail
 * @param tacheId       tâche sur laquelle le temps est imputé
 * @param jour          journée travaillée
 * @param duree         durée en heures
 * @param commentaire   commentaire libre
 */
public record SaisieTempsResponse(
		Long id,
		Long utilisateurId,
		Long tacheId,
		LocalDate jour,
		BigDecimal duree,
		String commentaire) {

	/**
	 * @param saisie entité à convertir (appeler dans une transaction)
	 * @return la représentation API de la saisie
	 */
	public static SaisieTempsResponse from(SaisieTemps saisie) {
		return new SaisieTempsResponse(saisie.getId(), saisie.getUtilisateur().getId(), saisie.getTache().getId(),
				saisie.getJour(), saisie.getDuree(), saisie.getCommentaire());
	}

}
