package com.lirox.gestiontemps.dto;

import java.time.YearMonth;

import com.lirox.gestiontemps.domain.Cloture;

/**
 * Clôture renvoyée par l'API ; la date et l'auteur de la clôture sont ceux de {@code audit}.
 *
 * @param id       identifiant
 * @param version  version courante
 * @param projetId projet clôturé
 * @param mois     mois clôturé (format AAAA-MM)
 * @param audit    date et auteur de la création et de la dernière modification
 */
public record ClotureResponse(
		Long id,
		long version,
		Long projetId,
		YearMonth mois,
		AuditResponse audit) {

	/**
	 * @param cloture entité à convertir (appeler dans une transaction)
	 * @return la représentation API de la clôture
	 */
	public static ClotureResponse from(Cloture cloture) {
		return new ClotureResponse(cloture.getId(), cloture.getVersion(), cloture.getProjet().getId(),
				YearMonth.from(cloture.getMois()), AuditResponse.from(cloture));
	}

}
