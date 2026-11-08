package com.lirox.gestiontemps;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.micrometer.metrics.test.autoconfigure.AutoConfigureMetrics;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

import com.lirox.gestiontemps.common.Constantes;

/**
 * Démarrage complet de l'application avec la configuration de production
 * ({@code application-prod.yml}), sur de vrais ports : les variables d'environnement du déploiement
 * sont fournies comme propriétés (identifiants ignorés par Testcontainers). La base est un
 * MariaDB Testcontainers vide, propre à cette classe
 * ({@code TC_DAEMON} : le conteneur survit à la fermeture de la connexion des migrations, qui passent
 * par le compte Flyway distinct du profil prod).
 * <p>
 * Vérifie que la configuration de production est complète (base, OIDC) et l'exploitation : sondes
 * et métriques sur le port de gestion sans jeton, absentes du port de l'API, version de
 * l'application, logs JSON.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
		"DB_URL=jdbc:tc:mariadb:11.4:///gestion_temps?TC_DAEMON=true",
		"DB_USERNAME=test",
		"DB_PASSWORD=",
		"spring.datasource.driver-class-name=org.testcontainers.jdbc.ContainerDatabaseDriver",
		"OIDC_ISSUER_URI=https://oidc.invalid/prod",
		"OIDC_AUDIENCE=gestion-temps-api",
		"MANAGEMENT_PORT=0" })
@ActiveProfiles("prod")
@AutoConfigureMetrics
class GestionTempsApplicationProductionTest {

	private static final HttpClient CLIENT = HttpClient.newHttpClient();

	@LocalServerPort
	private int portApi;

	@LocalManagementPort
	private int portGestion;

	@Autowired
	private BuildProperties build;

	@Autowired
	private Environment environment;

	@AfterAll
	static void fermerClient() {
		CLIENT.close();
	}

	@Test
	void lesSondesDeSanteSontSurLePortDeGestionSansJeton() throws Exception {
		HttpResponse<String> pret = appeler(portGestion, "/actuator/health/readiness");
		assertThat(pret.statusCode()).isEqualTo(200);
		assertThat(pret.body()).contains("\"status\":\"UP\"").contains("\"db\"");
		assertThat(appeler(portGestion, "/actuator/health/liveness").statusCode()).isEqualTo(200);
	}

	@Test
	void lesMetriquesPrometheusSontSurLePortDeGestionSansJeton() throws Exception {
		HttpResponse<String> metriques = appeler(portGestion, "/actuator/prometheus");
		assertThat(metriques.statusCode()).isEqualTo(200);
		assertThat(metriques.body()).contains("hikaricp_connections_max{pool=\"gestion-temps\"} 10.0");
	}

	@Test
	void laVersionDeLApplicationEstPubliee() throws Exception {
		HttpResponse<String> info = appeler(portGestion, "/actuator/info");
		assertThat(info.statusCode()).isEqualTo(200);
		assertThat(info.body()).contains("\"version\":\"" + build.getVersion() + "\"");
	}

	@Test
	void actuatorNEstPasServiSurLePortDeLApi() throws Exception {
		for (String url : new String[] { "/actuator/health", "/actuator/prometheus", "/actuator/info" }) {
			assertThat(appeler(portApi, url).statusCode()).as(url).isEqualTo(404);
		}
	}

	@Test
	void lApiExigeUnJetonEtRenvoieUnIdentifiantDeCorrelation() throws Exception {
		HttpResponse<String> reponse = appeler(portApi, "/api/projets");
		assertThat(reponse.statusCode()).isEqualTo(401);
		assertThat(reponse.headers().firstValue(Constantes.EN_TETE_CORRELATION)).isPresent();
	}

	@Test
	void laDocumentationOpenApiEstDesactivee() throws Exception {
		assertThat(appeler(portApi, "/v3/api-docs").statusCode()).isEqualTo(404);
	}

	/**
	 * La sortie elle-même n'est pas vérifiable ici : Logback n'est configuré qu'une fois par JVM tant
	 * que les contextes des autres classes de test restent ouverts.
	 */
	@Test
	void lesLogsSontEnJsonEcs() {
		assertThat(environment.getProperty("logging.structured.format.console")).isEqualTo("ecs");
	}

	private static HttpResponse<String> appeler(int port, String chemin) throws IOException, InterruptedException {
		return CLIENT.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + chemin)).build(),
				HttpResponse.BodyHandlers.ofString());
	}

}
