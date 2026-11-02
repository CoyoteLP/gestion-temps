package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Auteur et date enregistrés par l'audit des entités.
 */
class AuditConfigTest {

	private final AuditConfig config = new AuditConfig();

	@Test
	void lAuteurEstLEmailDuJeton() {
		Jwt jeton = jeton().claim("email", "jdupont@lirox.test").build();
		assertThat(AuditConfig.auteur(new JwtAuthenticationToken(jeton, List.of()))).contains("jdupont@lirox.test");
	}

	@Test
	void lAuteurEstLeSujetSiLeJetonNAPasDEmail() {
		assertThat(AuditConfig.auteur(new JwtAuthenticationToken(jeton().build(), List.of()))).contains("sujet-1");
	}

	@Test
	void aucunAuteurSansAuthentificationParJeton() {
		assertThat(AuditConfig.auteur(null)).isEmpty();
		assertThat(AuditConfig.auteur(new UsernamePasswordAuthenticationToken("jdupont", "secret", List.of())))
				.isEmpty();
	}

	@Test
	void lHorodatageSuitLHorlogeEtSArreteALaMicroseconde() {
		Clock horloge = Clock.fixed(Instant.parse("2026-11-02T08:30:00.123456789Z"), ZoneOffset.UTC);
		assertThat(config.horodatageAudit(horloge).getNow())
				.contains(Instant.parse("2026-11-02T08:30:00.123456Z"));
	}

	private static Jwt.Builder jeton() {
		return Jwt.withTokenValue("jeton").header("alg", "none").subject("sujet-1");
	}

}
