package com.lirox.gestiontemps.config;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.actuate.autoconfigure.web.server.ManagementPortType;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.authorization.SingleResultAuthorizationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.lirox.gestiontemps.common.Constantes;

/**
 * Sécurité de l'API : jetons JWT émis par le fournisseur OIDC
 * ({@code spring.security.oauth2.resourceserver.jwt.issuer-uri}), sans session ni cookie.
 * <ul>
 * <li>publics : la santé ({@code /actuator/health}) et la documentation OpenAPI (désactivée par
 * défaut en production) ;</li>
 * <li>autres points Actuator (informations, métriques Prometheus) : publics s'ils sont servis sur un
 * port de gestion séparé ({@code management.server.port}, production), que seul le réseau interne
 * atteint ; réservés au rôle {@link Constantes#ROLE_ADMIN} sur le port de l'API ;</li>
 * <li>tout utilisateur authentifié peut lire ({@code GET}), gérer ses saisies de temps et demander
 * une clôture ; les règles fines (ses propres saisies, membres d'un projet) sont appliquées par les
 * services ;</li>
 * <li>les autres écritures (projets, tâches, utilisateurs, membres) sont réservées au rôle
 * {@link Constantes#ROLE_ADMIN} ;</li>
 * <li>401 et 403 sont renvoyés dans l'enveloppe {@code ApiResponse} par le
 * {@code GlobalExceptionHandler}.</li>
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(ProprietesSecurite.class)
public class SecurityConfig {

	private static final String PREFIXE_ROLE = "ROLE_";

	/**
	 * @param http              configuration HTTP de Spring Security
	 * @param proprietes        paramètres de sécurité de l'application
	 * @param exceptionResolver résolveur de Spring MVC, pour traiter 401 et 403 comme les autres erreurs
	 * @param environment       configuration, pour savoir si Actuator a son propre port
	 * @return la chaîne de filtres de sécurité
	 * @throws Exception si la configuration est invalide
	 */
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, ProprietesSecurite proprietes,
			@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver, Environment environment)
			throws Exception {
		boolean portDeGestionSepare = ManagementPortType.get(environment) == ManagementPortType.DIFFERENT;
		AuthenticationEntryPoint authentificationRequise = authentificationRequise(exceptionResolver);
		AccessDeniedHandler accesRefuse = (request, response, ex) -> exceptionResolver.resolveException(request,
				response, null, ex);
		return http
				// Sans session ni cookie, le jeton est envoyé explicitement dans l'en-tête Authorization :
				// un site tiers ne peut pas le faire envoyer par le navigateur, la protection CSRF est inutile
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(requetes -> requetes
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
						.requestMatchers("/actuator/**").access(portDeGestionSepare
								? SingleResultAuthorizationManager.permitAll()
								: AuthorityAuthorizationManager.hasRole(Constantes.ROLE_ADMIN))
						.requestMatchers("/v3/api-docs", "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**")
						.permitAll()
						.requestMatchers(HttpMethod.GET, "/api/**").authenticated()
						.requestMatchers("/api/saisies-temps", "/api/saisies-temps/**").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/clotures", "/api/clotures/tous-projets").authenticated()
						.requestMatchers("/api/**").hasRole(Constantes.ROLE_ADMIN)
						.anyRequest().authenticated())
				.oauth2ResourceServer(serveur -> serveur
						.jwt(jwt -> jwt.jwtAuthenticationConverter(convertisseurJwt(proprietes)))
						.authenticationEntryPoint(authentificationRequise))
				.exceptionHandling(erreurs -> erreurs
						.authenticationEntryPoint(authentificationRequise)
						.accessDeniedHandler(accesRefuse))
				.build();
	}

	/**
	 * Convertit le jeton en authentification : rôles lus dans la revendication configurée, préfixés
	 * {@code ROLE_} (ex. {@code ADMIN} → {@code ROLE_ADMIN}).
	 *
	 * @param proprietes paramètres de sécurité de l'application
	 * @return le convertisseur de jeton
	 */
	static JwtAuthenticationConverter convertisseurJwt(ProprietesSecurite proprietes) {
		JwtAuthenticationConverter convertisseur = new JwtAuthenticationConverter();
		convertisseur.setJwtGrantedAuthoritiesConverter(jwt -> roles(jwt, proprietes.claimRoles()));
		return convertisseur;
	}

	/** Rôles lus au chemin donné : liste de valeurs, ou chaîne séparée par des espaces ou des virgules. */
	static Collection<GrantedAuthority> roles(Jwt jwt, String chemin) {
		Object valeur = jwt.getClaims();
		for (String segment : chemin.split("\\.")) {
			valeur = valeur instanceof Map<?, ?> revendications ? revendications.get(segment) : null;
		}
		Stream<String> noms = switch (valeur) {
			case Collection<?> liste -> liste.stream().map(String::valueOf);
			case String texte -> Stream.of(texte.split("[\\s,]+"));
			case null, default -> Stream.empty();
		};
		return noms.filter(nom -> !nom.isBlank())
				.map(nom -> (GrantedAuthority) new SimpleGrantedAuthority(PREFIXE_ROLE + nom.trim().toUpperCase()))
				.toList();
	}

	/**
	 * 401 : pose l'en-tête {@code WWW-Authenticate} standard puis délègue le corps de la réponse au
	 * {@code GlobalExceptionHandler}.
	 */
	private static AuthenticationEntryPoint authentificationRequise(HandlerExceptionResolver exceptionResolver) {
		BearerTokenAuthenticationEntryPoint bearer = new BearerTokenAuthenticationEntryPoint();
		return (request, response, ex) -> {
			bearer.commence(request, response, ex);
			exceptionResolver.resolveException(request, response, null, ex);
		};
	}

}
