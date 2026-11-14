package com.lirox.gestiontemps.dto;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Énumération lue dans un paramètre de requête (colonne de tri, sens) : sa valeur dans l'API et dans
 * la documentation OpenAPI ({@code nom}, {@code asc}) est distincte du nom de la constante Java
 * ({@code NOM}, {@code ASC}). La conversion depuis l'URL est faite par
 * {@code ConversionParametresConfig} ; une valeur inconnue donne 400.
 */
public interface ValeurParametre {

	/**
	 * @return la valeur attendue dans l'URL
	 */
	@JsonValue
	String valeur();

}
