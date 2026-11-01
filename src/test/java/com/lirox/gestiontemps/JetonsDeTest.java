package com.lirox.gestiontemps;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Utilisateur;

/**
 * Jetons OIDC simulés pour les tests MockMvc ({@code jwt()} de spring-security-test : aucun
 * fournisseur n'est contacté).
 * <p>
 * {@link AdministrateurParDefaut}, importé par une classe de test, authentifie par défaut chaque
 * requête en administrateur ; une requête peut le remplacer par {@code .with(collaborateur(...))} ou
 * {@code .with(anonymous())}.
 */
public final class JetonsDeTest {

	/** Sujet (revendication {@code sub}) de l'administrateur par défaut, rattaché à aucun utilisateur. */
	public static final String SUJET_ADMIN = "admin-test";

	private JetonsDeTest() {
	}

	/**
	 * @return un jeton portant le rôle administrateur
	 */
	public static RequestPostProcessor admin() {
		return jwt().jwt(jeton -> jeton.subject(SUJET_ADMIN))
				.authorities(new SimpleGrantedAuthority("ROLE_" + Constantes.ROLE_ADMIN));
	}

	/**
	 * @param utilisateur utilisateur dont le compte est déjà rattaché (sujet renseigné)
	 * @return un jeton de collaborateur (sans rôle) pour cet utilisateur
	 */
	public static RequestPostProcessor collaborateur(Utilisateur utilisateur) {
		return jwt().jwt(jeton -> jeton.subject(utilisateur.getSujet()));
	}

	/**
	 * Authentifie par défaut toutes les requêtes MockMvc en administrateur.
	 */
	@TestConfiguration
	public static class AdministrateurParDefaut {

		@Bean
		MockMvcBuilderCustomizer administrateurParDefaut() {
			return builder -> builder.defaultRequest(get("/").with(admin()));
		}

	}

}
