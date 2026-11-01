package com.lirox.gestiontemps.config;

import com.lirox.gestiontemps.exception.ApplicationException;

/**
 * Levée au démarrage lorsque les informations de connexion à la base de données ne sont pas
 * renseignées. {@link ConfigurationBaseDonneesManquanteFailureAnalyzer} la présente sous forme d'un
 * message explicite plutôt que d'une pile d'appels.
 */
public class ConfigurationBaseDonneesManquanteException extends ApplicationException {

	private final String action;

	/**
	 * @param description ce qui manque
	 * @param action      ce que l'utilisateur doit faire pour corriger
	 */
	public ConfigurationBaseDonneesManquanteException(String description, String action) {
		super(description);
		this.action = action;
	}

	/**
	 * @return la correction à apporter
	 */
	public String getAction() {
		return action;
	}

}
