package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.repository.ProjetRepository;

/**
 * Règles d'accès par URL et rôle (sans administrateur par défaut : chaque requête précise son
 * jeton), réponses 401/403, validation des vrais jetons (signature, émetteur, audience,
 * expiration) et lecture des rôles dans le jeton.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityConfigTest {

	/** Audience attendue par le profil test (application-test.yml). */
	private static final String AUDIENCE_API = "gestion-temps-api";

	/** Clé de signature des jetons de test, générée à chaque exécution : aucune clé n'est versionnée. */
	private static final RSAKey CLE = genererCle("cle-test");

	/**
	 * Mini-fournisseur OIDC local (serveur HTTP du JDK, port libre) : publie la configuration OIDC
	 * et la clé publique de {@link #CLE}, comme Keycloak ou Entra ID. L'API le découvre par
	 * {@code issuer-uri}, exactement comme en production.
	 */
	private static final HttpServer FOURNISSEUR = demarrerFournisseur();

	private static final String EMETTEUR = "http://localhost:" + FOURNISSEUR.getAddress().getPort() + "/realms/test";

	@DynamicPropertySource
	static void fournisseurOidcLocal(DynamicPropertyRegistry proprietes) {
		proprietes.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> EMETTEUR);
	}

	@AfterAll
	static void arreterFournisseur() {
		FOURNISSEUR.stop(0);
	}

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Test
	void requeteSansJetonRenvoie401() throws Exception {
		mockMvc.perform(get("/api/projets"))
				.andExpect(status().isUnauthorized())
				.andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, startsWith("Bearer")))
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.data").doesNotExist())
				.andExpect(jsonPath("$.message").value("Authentification requise : jeton absent, invalide ou expiré"));
	}

	@ParameterizedTest
	@CsvSource({
			"GET,    /api/projets",
			"GET,    /api/taches",
			"GET,    /api/utilisateurs",
			"GET,    /api/saisies-temps",
			"GET,    /api/projets/1/membres",
			"GET,    /api/projets/1/membres/1",
			"POST,   /api/projets/1/membres",
			"PUT,    /api/projets/1/membres/1",
			"DELETE, /api/projets/1/membres/1",
			"GET,    /api/clotures",
			"POST,   /api/clotures",
			"POST,   /api/clotures/tous-projets",
			"DELETE, /api/clotures/1" })
	void toutesLesRessourcesExigentUnJeton(String methode, String url) throws Exception {
		mockMvc.perform(request(HttpMethod.valueOf(methode), url).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value("error"));
	}

	// Vrais jetons signés, décodés et validés comme en production (signature, émetteur, audience,
	// expiration), avec les clés publiées par le fournisseur OIDC local.

	@Test
	void unJetonDestineALApiEstAccepte() throws Exception {
		mockMvc.perform(get("/api/projets").header(HttpHeaders.AUTHORIZATION, bearer(jetonSigne(CLE, AUDIENCE_API))))
				.andExpect(status().isOk());
	}

	@Test
	void unJetonDestineAUneAutreApplicationEstRefuse() throws Exception {
		mockMvc.perform(get("/api/projets")
				.header(HttpHeaders.AUTHORIZATION, bearer(jetonSigne(CLE, "autre-application"))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value("Authentification requise : jeton absent, invalide ou expiré"));
	}

	@Test
	void unJetonSansAudienceEstRefuse() throws Exception {
		mockMvc.perform(get("/api/projets").header(HttpHeaders.AUTHORIZATION, bearer(jetonSigne(CLE, null))))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void unJetonDUnAutreEmetteurEstRefuse() throws Exception {
		String jeton = signer(CLE, revendications(AUDIENCE_API).issuer("https://autre-fournisseur.invalid").build());
		mockMvc.perform(get("/api/projets").header(HttpHeaders.AUTHORIZATION, bearer(jeton)))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void unJetonExpireEstRefuse() throws Exception {
		Instant ilYADeuxHeures = Instant.now().minus(Duration.ofHours(2));
		String jeton = signer(CLE, revendications(AUDIENCE_API).issueTime(Date.from(ilYADeuxHeures))
				.expirationTime(Date.from(ilYADeuxHeures.plus(Duration.ofMinutes(30)))).build());
		mockMvc.perform(get("/api/projets").header(HttpHeaders.AUTHORIZATION, bearer(jeton)))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void unJetonSigneParUneAutreCleEstRefuse() throws Exception {
		mockMvc.perform(get("/api/projets")
				.header(HttpHeaders.AUTHORIZATION, bearer(jetonSigne(genererCle("autre-cle"), AUDIENCE_API))))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void laSanteEstPubliqueEtRienDAutre() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk());
		mockMvc.perform(get("/actuator/info"))
				.andExpect(status().isUnauthorized());
	}

	@ParameterizedTest
	@ValueSource(strings = { "/api/projets", "/api/taches", "/api/utilisateurs" })
	void unCollaborateurPeutToutLire(String url) throws Exception {
		mockMvc.perform(get(url).with(jwt()))
				.andExpect(status().isOk());
	}

	@ParameterizedTest
	@CsvSource({
			"POST,   /api/projets",
			"PUT,    /api/projets/1",
			"DELETE, /api/projets/1",
			"POST,   /api/taches",
			"PUT,    /api/taches/1",
			"DELETE, /api/taches/1",
			"POST,   /api/utilisateurs",
			"PUT,    /api/utilisateurs/1",
			"DELETE, /api/utilisateurs/1",
			"POST,   /api/projets/1/membres",
			"PUT,    /api/projets/1/membres/1",
			"DELETE, /api/projets/1/membres/1",
			"DELETE, /api/clotures/1" })
	void lesAutresEcrituresSontReserveesAuxAdministrateurs(String methode, String url) throws Exception {
		mockMvc.perform(request(HttpMethod.valueOf(methode), url).with(jwt())
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.message").value("Accès refusé : cette opération est réservée aux administrateurs"));
	}

	@Test
	void unAdministrateurPeutEcrire() throws Exception {
		mockMvc.perform(request(HttpMethod.POST, "/api/projets").with(JetonsDeTest.admin())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"code": "PRJ-01", "nom": "Projet"}
						"""))
				.andExpect(status().isCreated());
		assertThat(projetRepository.count()).isEqualTo(1);
	}

	@Test
	void unCollaborateurNEcritRienSansDroit() throws Exception {
		mockMvc.perform(request(HttpMethod.POST, "/api/projets").with(jwt())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"code": "PRJ-01", "nom": "Projet"}
						"""))
				.andExpect(status().isForbidden());
		assertThat(projetRepository.count()).isZero();
	}

	@Test
	void rolesLusDansUneListe() {
		assertThat(noms(SecurityConfig.roles(jeton(Map.of("roles", List.of("ADMIN", "lecteur"))), "roles")))
				.containsExactly("ROLE_ADMIN", "ROLE_LECTEUR");
	}

	@Test
	void rolesLusDansUneRevendicationImbriquee() {
		Jwt jeton = jeton(Map.of("realm_access", Map.of("roles", List.of("ADMIN"))));
		assertThat(noms(SecurityConfig.roles(jeton, "realm_access.roles"))).containsExactly("ROLE_ADMIN");
	}

	@Test
	void rolesLusDansUneChaine() {
		assertThat(noms(SecurityConfig.roles(jeton(Map.of("roles", "ADMIN, lecteur")), "roles")))
				.containsExactly("ROLE_ADMIN", "ROLE_LECTEUR");
	}

	@Test
	void aucunRoleSiLaRevendicationEstAbsenteOuMalFormee() {
		assertThat(SecurityConfig.roles(jeton(Map.of("autre", "ADMIN")), "roles")).isEmpty();
		assertThat(SecurityConfig.roles(jeton(Map.of("realm_access", "ADMIN")), "realm_access.roles")).isEmpty();
		assertThat(SecurityConfig.roles(jeton(Map.of("roles", 42)), "roles")).isEmpty();
	}

	private static String bearer(String jeton) {
		return "Bearer " + jeton;
	}

	private static String jetonSigne(RSAKey cle, String audience) throws JOSEException {
		return signer(cle, revendications(audience).build());
	}

	/** Revendications d'un jeton valide (émetteur du profil test, valable 30 minutes). */
	private static JWTClaimsSet.Builder revendications(String audience) {
		Instant maintenant = Instant.now();
		JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder().issuer(EMETTEUR).subject("sujet-test")
				.issueTime(Date.from(maintenant)).expirationTime(Date.from(maintenant.plus(Duration.ofMinutes(30))));
		return audience == null ? builder : builder.audience(audience);
	}

	private static String signer(RSAKey cle, JWTClaimsSet revendications) throws JOSEException {
		JWSHeader entete = new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(cle.getKeyID()).build();
		SignedJWT jeton = new SignedJWT(entete, revendications);
		jeton.sign(new RSASSASigner(cle));
		return jeton.serialize();
	}

	private static HttpServer demarrerFournisseur() {
		try {
			HttpServer serveur = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
			serveur.createContext("/realms/test/.well-known/openid-configuration", echange -> repondre(echange, """
					{"issuer": "%1$s", "jwks_uri": "%1$s/certs", "authorization_endpoint": "%1$s/auth",
					 "token_endpoint": "%1$s/token", "response_types_supported": ["code"],
					 "subject_types_supported": ["public"], "id_token_signing_alg_values_supported": ["RS256"]}
					""".formatted(EMETTEUR)));
			serveur.createContext("/realms/test/certs",
					echange -> repondre(echange, new JWKSet(CLE.toPublicJWK()).toString()));
			serveur.start();
			return serveur;
		}
		catch (IOException e) {
			throw new UncheckedIOException("Démarrage du fournisseur OIDC de test impossible", e);
		}
	}

	private static void repondre(HttpExchange echange, String json) throws IOException {
		byte[] corps = json.getBytes(StandardCharsets.UTF_8);
		echange.getResponseHeaders().add("Content-Type", "application/json");
		echange.sendResponseHeaders(200, corps.length);
		try (OutputStream sortie = echange.getResponseBody()) {
			sortie.write(corps);
		}
	}

	private static RSAKey genererCle(String identifiant) {
		try {
			return new RSAKeyGenerator(2048).keyID(identifiant).generate();
		}
		catch (JOSEException e) {
			throw new IllegalStateException("Génération de la clé de test impossible", e);
		}
	}

	private static Jwt jeton(Map<String, Object> revendications) {
		Jwt.Builder builder = Jwt.withTokenValue("jeton").header("alg", "none").subject("sujet");
		revendications.forEach(builder::claim);
		return builder.build();
	}

	private static List<String> noms(Collection<GrantedAuthority> roles) {
		return roles.stream().map(GrantedAuthority::getAuthority).toList();
	}

}
