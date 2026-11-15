package com.lirox.gestiontemps.dto;

import java.math.BigDecimal;

/**
 * Synthèse d'un mois (administrateur) : une page de projets et le total général des heures saisies
 * sur l'ensemble des projets retenus par les filtres (pas seulement ceux de la page).
 *
 * @param projets     page de synthèses par projet, triées par code
 * @param totalHeures total des heures du mois sur tous les projets filtrés (0 sans saisie)
 */
public record SyntheseMoisResponse(
		PageResponse<SyntheseProjetResponse> projets,
		BigDecimal totalHeures) {

	/** Sans saisie dans le mois, la somme vaut null en SQL : elle est ramenée à 0. */
	public SyntheseMoisResponse {
		totalHeures = totalHeures == null ? BigDecimal.ZERO : totalHeures;
	}

}
