package com.lirox.gestiontemps.dto;

import java.time.YearMonth;

import jakarta.validation.constraints.NotNull;

/**
 * Clôture d'un mois pour un projet.
 *
 * @param projetId projet à clôturer
 * @param mois     mois à clôturer, terminé (format AAAA-MM, ex. {@code 2026-10})
 */
public record ClotureRequest(
		@NotNull Long projetId,
		@NotNull YearMonth mois) {
}
