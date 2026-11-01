package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.diagnostics.FailureAnalysis;

/**
 * Vérifie que l'échec de démarrage est présenté avec la description et l'action de l'exception,
 * y compris lorsqu'elle est encapsulée dans une autre exception.
 */
class ConfigurationBaseDonneesManquanteFailureAnalyzerTest {

	private final ConfigurationBaseDonneesManquanteFailureAnalyzer analyzer =
			new ConfigurationBaseDonneesManquanteFailureAnalyzer();

	@Test
	void reprendDescriptionEtActionDeLException() {
		ConfigurationBaseDonneesManquanteException cause =
				new ConfigurationBaseDonneesManquanteException("DB_URL manquant", "Renseigner DB_URL");
		FailureAnalysis analyse = analyzer.analyze(new IllegalStateException("enveloppe", cause));
		assertThat(analyse.getDescription()).isEqualTo("DB_URL manquant");
		assertThat(analyse.getAction()).isEqualTo("Renseigner DB_URL");
	}

	@Test
	void ignoreLesAutresEchecs() {
		assertThat(analyzer.analyze(new IllegalStateException("autre"))).isNull();
	}

}
