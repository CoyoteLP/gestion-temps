package com.lirox.gestiontemps.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

/**
 * Vérifie au démarrage, avant toute connexion, que les informations de connexion à la base de
 * données sont renseignées (fichier {@code .env} en dev, variables d'environnement en prod), et
 * arrête l'application avec un message explicite sinon.
 * <p>
 * S'exécute après le chargement de la configuration (y compris l'import du {@code .env}) ; ignoré
 * pour les autres profils, notamment {@code test} qui utilise une base MariaDB Testcontainers.
 * Enregistré dans {@code META-INF/spring.factories}.
 */
public class VerificationConfigurationBaseDonnees implements EnvironmentPostProcessor, Ordered {

	private static final String PROFIL_DEV = "dev";
	private static final String PROFIL_PROD = "prod";
	private static final String FICHIER_ENV = ".env";

	/** Variables qui doivent avoir une valeur non vide. */
	private static final List<String> VARIABLES_OBLIGATOIRES = List.of("DB_URL", "DB_USERNAME");

	/** Variable qui doit être définie, mais peut être vide (base locale sans mot de passe). */
	private static final String VARIABLE_MOT_DE_PASSE = "DB_PASSWORD";

	private final Path fichierEnv;

	/**
	 * Constructeur utilisé par Spring Boot : le {@code .env} est cherché dans le répertoire courant.
	 */
	public VerificationConfigurationBaseDonnees() {
		this(Path.of(FICHIER_ENV));
	}

	VerificationConfigurationBaseDonnees(Path fichierEnv) {
		this.fichierEnv = fichierEnv;
	}

	/**
	 * @param environment environnement après chargement de la configuration
	 * @param application application en cours de démarrage
	 * @throws ConfigurationBaseDonneesManquanteException si une information de connexion manque
	 */
	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		Set<String> profils = profilsEffectifs(environment);
		boolean dev = profils.contains(PROFIL_DEV);
		if (!dev && !profils.contains(PROFIL_PROD)) {
			return;
		}
		List<String> manquantes = variablesManquantes(environment);
		if (manquantes.isEmpty()) {
			return;
		}
		throw dev ? erreurDev(manquantes) : erreurProd(manquantes);
	}

	/** Après le chargement de la configuration par Spring Boot, pour voir le contenu du {@code .env}. */
	@Override
	public int getOrder() {
		return Ordered.LOWEST_PRECEDENCE;
	}

	private static Set<String> profilsEffectifs(ConfigurableEnvironment environment) {
		String[] actifs = environment.getActiveProfiles();
		return Set.copyOf(Arrays.asList(actifs.length > 0 ? actifs : environment.getDefaultProfiles()));
	}

	private static List<String> variablesManquantes(ConfigurableEnvironment environment) {
		List<String> manquantes = new ArrayList<>();
		for (String variable : VARIABLES_OBLIGATOIRES) {
			if (!StringUtils.hasText(environment.getProperty(variable))) {
				manquantes.add(variable);
			}
		}
		if (!environment.containsProperty(VARIABLE_MOT_DE_PASSE)) {
			manquantes.add(VARIABLE_MOT_DE_PASSE);
		}
		return manquantes;
	}

	private ConfigurationBaseDonneesManquanteException erreurDev(List<String> manquantes) {
		if (Files.notExists(fichierEnv)) {
			return new ConfigurationBaseDonneesManquanteException(
					"Fichier .env introuvable (" + fichierEnv.toAbsolutePath().normalize() + ") : les informations"
							+ " de connexion à la base de données ne sont pas renseignées.",
					"Copier le modèle à la racine du projet (cp .env.example .env), puis renseigner DB_URL,"
							+ " DB_USERNAME et DB_PASSWORD dans .env. Vérifier aussi que l'application est lancée"
							+ " depuis la racine du projet.");
		}
		return new ConfigurationBaseDonneesManquanteException(
				"Informations de connexion à la base de données non renseignées : " + String.join(", ", manquantes)
						+ ".",
				"Renseigner " + String.join(", ", manquantes) + " dans le fichier .env à la racine du projet"
						+ " (voir .env.example), ou définir les variables d'environnement correspondantes.");
	}

	private static ConfigurationBaseDonneesManquanteException erreurProd(List<String> manquantes) {
		return new ConfigurationBaseDonneesManquanteException(
				"Variables d'environnement de connexion à la base de données non renseignées : "
						+ String.join(", ", manquantes) + ".",
				"Définir " + String.join(", ", manquantes) + " dans l'environnement d'exécution du profil prod.");
	}

}
