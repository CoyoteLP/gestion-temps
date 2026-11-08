package com.lirox.gestiontemps.config;

import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Audit des entités ({@code EntiteAuditee}) : auteur déduit du jeton de l'appelant, date donnée par
 * l'horloge de l'application (remplaçable en test).
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auteurCourant", dateTimeProviderRef = "horodatageAudit")
public class AuditConfig {

	private static final String CLAIM_EMAIL = "email";

	/**
	 * @return l'auteur des modifications : email du jeton, ou son {@code sub} à défaut ; vide hors
	 *         requête authentifiée par jeton
	 */
	@Bean
	AuditorAware<String> auteurCourant() {
		return () -> auteur(SecurityContextHolder.getContext().getAuthentication());
	}

	/**
	 * @param clock horloge de l'application
	 * @return l'instant courant selon cette horloge, tronqué à la microseconde (précision des colonnes
	 *         {@code datetime(6)}) : la réponse renvoie le même instant que celui relu ensuite en base
	 */
	@Bean
	DateTimeProvider horodatageAudit(Clock clock) {
		return () -> Optional.of(clock.instant().truncatedTo(ChronoUnit.MICROS));
	}

	/** Email du jeton, sinon son sujet ; vide sans authentification par jeton. */
	static Optional<String> auteur(Authentication authentification) {
		if (authentification instanceof JwtAuthenticationToken jwt) {
			Jwt jeton = jwt.getToken();
			String email = jeton.getClaimAsString(CLAIM_EMAIL);
			return Optional.ofNullable(email != null ? email : jeton.getSubject());
		}
		return Optional.empty();
	}

}
