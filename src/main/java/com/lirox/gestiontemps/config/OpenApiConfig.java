package com.lirox.gestiontemps.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Documentation OpenAPI générée par springdoc : description JSON sur {@code /v3/api-docs}, interface
 * Swagger UI sur {@code /swagger-ui.html}, avec authentification par jeton (bouton « Authorize »).
 */
@Configuration
public class OpenApiConfig {

	private static final String SCHEMA_JETON = "jeton-oidc";

	/**
	 * @return la description générale de l'API et son schéma d'authentification
	 */
	@Bean
	public OpenAPI documentationApi() {
		return new OpenAPI()
				.info(new Info().title("gestion-temps")
						.description("API REST de gestion du temps de travail. Toutes les réponses utilisent "
								+ "l'enveloppe { status, data, message } ; les listes sont paginées "
								+ "(page à partir de 1, taille)."))
				.components(new Components().addSecuritySchemes(SCHEMA_JETON, new SecurityScheme()
						.type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
						.description("Jeton d'accès OIDC destiné à l'API (revendication aud)")))
				.addSecurityItem(new SecurityRequirement().addList(SCHEMA_JETON));
	}

}
