package com.lirox.gestiontemps.dto;

import jakarta.validation.constraints.Size;

/**
 * Filtres de la synthèse mensuelle des projets (paramètres de requête, tous facultatifs).
 *
 * @param projet  texte contenu dans le code ou le nom du projet (casse et accents ignorés)
 * @param cloture true : projets dont le mois est clôturé ; false : mois ouvert ; absent : tous
 */
public record RechercheSyntheseRequest(
		@Size(max = 100) String projet,
		Boolean cloture) {
}
