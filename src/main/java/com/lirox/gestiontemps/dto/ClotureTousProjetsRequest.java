package com.lirox.gestiontemps.dto;

import java.time.YearMonth;

import jakarta.validation.constraints.NotNull;

/**
 * Clôture d'un mois pour tous les projets actifs qui ne le sont pas encore (administrateur).
 *
 * @param mois mois à clôturer, terminé (format AAAA-MM, ex. {@code 2026-10})
 */
public record ClotureTousProjetsRequest(
		@NotNull YearMonth mois) {
}
