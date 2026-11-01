package com.lirox.gestiontemps.config;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

/**
 * Affiche l'échec de démarrage dû à une configuration de base de données manquante dans le format
 * standard de Spring Boot (« APPLICATION FAILED TO START », Description, Action).
 * <p>
 * Enregistré dans {@code META-INF/spring.factories}.
 */
public class ConfigurationBaseDonneesManquanteFailureAnalyzer
		extends AbstractFailureAnalyzer<ConfigurationBaseDonneesManquanteException> {

	/**
	 * @param rootFailure échec d'origine
	 * @param cause       exception de configuration manquante trouvée dans la chaîne des causes
	 * @return la description du problème et l'action corrective
	 */
	@Override
	protected FailureAnalysis analyze(Throwable rootFailure, ConfigurationBaseDonneesManquanteException cause) {
		return new FailureAnalysis(cause.getMessage(), cause.getAction(), cause);
	}

}
