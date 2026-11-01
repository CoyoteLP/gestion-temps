package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

/**
 * Vérifie le contrôle de démarrage des informations de connexion, sans démarrer Spring.
 */
class VerificationConfigurationBaseDonneesTest {

	@TempDir
	Path dossier;

	@Test
	void profilTestNEstPasControle() {
		MockEnvironment environment = new MockEnvironment();
		environment.setActiveProfiles("test");
		VerificationConfigurationBaseDonnees verification = sansFichierEnv();
		assertThatCode(() -> verification.postProcessEnvironment(environment, null)).doesNotThrowAnyException();
	}

	@Test
	void devAvecToutesLesVariablesDemarre() throws IOException {
		MockEnvironment environment = complet();
		environment.setActiveProfiles("dev");
		VerificationConfigurationBaseDonnees verification = avecFichierEnv();
		assertThatCode(() -> verification.postProcessEnvironment(environment, null)).doesNotThrowAnyException();
	}

	@Test
	void motDePasseVideEstAccepte() throws IOException {
		MockEnvironment environment = complet().withProperty("DB_PASSWORD", "");
		environment.setActiveProfiles("dev");
		VerificationConfigurationBaseDonnees verification = avecFichierEnv();
		assertThatCode(() -> verification.postProcessEnvironment(environment, null)).doesNotThrowAnyException();
	}

	@Test
	void devSansFichierEnvIndiqueDeCopierLeModele() {
		MockEnvironment environment = new MockEnvironment();
		environment.setActiveProfiles("dev");
		VerificationConfigurationBaseDonnees verification = sansFichierEnv();
		assertThatThrownBy(() -> verification.postProcessEnvironment(environment, null))
				.isInstanceOfSatisfying(ConfigurationBaseDonneesManquanteException.class, e -> {
					assertThat(e.getMessage()).startsWith("Fichier .env introuvable");
					assertThat(e.getAction()).contains("cp .env.example .env");
				});
	}

	@Test
	void profilParDefautDevEstControle() {
		MockEnvironment environment = new MockEnvironment();
		environment.setDefaultProfiles("dev");
		VerificationConfigurationBaseDonnees verification = sansFichierEnv();
		assertThatThrownBy(() -> verification.postProcessEnvironment(environment, null))
				.isInstanceOf(ConfigurationBaseDonneesManquanteException.class);
	}

	@Test
	void devAvecFichierIncompletListeLesVariablesManquantes() throws IOException {
		MockEnvironment environment = new MockEnvironment()
				.withProperty("DB_URL", "")
				.withProperty("DB_USERNAME", "root");
		environment.setActiveProfiles("dev");
		VerificationConfigurationBaseDonnees verification = avecFichierEnv();
		assertThatThrownBy(() -> verification.postProcessEnvironment(environment, null))
				.isInstanceOf(ConfigurationBaseDonneesManquanteException.class)
				.hasMessage("Informations de connexion à la base de données non renseignées : DB_URL, DB_PASSWORD.");
	}

	@Test
	void prodSansVariablesDemandeDeLesDefinirDansLEnvironnement() {
		MockEnvironment environment = new MockEnvironment().withProperty("DB_URL", "jdbc:mariadb://db/gt");
		environment.setActiveProfiles("prod");
		VerificationConfigurationBaseDonnees verification = sansFichierEnv();
		assertThatThrownBy(() -> verification.postProcessEnvironment(environment, null))
				.isInstanceOf(ConfigurationBaseDonneesManquanteException.class)
				.hasMessage("Variables d'environnement de connexion à la base de données non renseignées :"
						+ " DB_USERNAME, DB_PASSWORD.");
	}

	private static MockEnvironment complet() {
		return new MockEnvironment()
				.withProperty("DB_URL", "jdbc:mariadb://localhost:3306/gt")
				.withProperty("DB_USERNAME", "root")
				.withProperty("DB_PASSWORD", "secret");
	}

	private VerificationConfigurationBaseDonnees avecFichierEnv() throws IOException {
		return new VerificationConfigurationBaseDonnees(Files.writeString(dossier.resolve(".env"), "DB_URL=x"));
	}

	private VerificationConfigurationBaseDonnees sansFichierEnv() {
		return new VerificationConfigurationBaseDonnees(dossier.resolve(".env"));
	}

}
