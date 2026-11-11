package com.lirox.gestiontemps.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.lirox.gestiontemps.dto.AuditResponse;
import com.lirox.gestiontemps.service.UtilisateurCourantService;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.BeanDescription;
import tools.jackson.databind.BeanProperty;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.SerializationConfig;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.ValueSerializerModifier;

/**
 * Le champ {@code audit} des réponses (auteurs et dates de création et de modification) n'est
 * renvoyé qu'aux administrateurs : il vaut {@code null} pour les autres, qui n'ont pas à connaître
 * l'email des auteurs. Appliqué à la sérialisation JSON, pour toutes les réponses à la fois ; les
 * DTO et les services n'en tiennent pas compte.
 */
@Configuration
public class AuditReserveConfig {

	/**
	 * @param utilisateurCourant identité de l'appelant, pour savoir s'il est administrateur
	 * @return le module Jackson qui masque l'audit aux non-administrateurs (enregistré par Spring Boot)
	 */
	@Bean
	JacksonModule auditReserveAuxAdministrateurs(UtilisateurCourantService utilisateurCourant) {
		return new SimpleModule("audit-reserve-aux-administrateurs")
				.setSerializerModifier(new ValueSerializerModifier() {

					@Override
					public ValueSerializer<?> modifySerializer(SerializationConfig config,
							BeanDescription.Supplier description, ValueSerializer<?> serializer) {
						return AuditResponse.class.equals(description.getBeanClass())
								? new SerialiseurAuditReserve(serializer, utilisateurCourant)
								: serializer;
					}

				});
	}

	/** Délègue au sérialiseur standard de {@link AuditResponse} pour un administrateur, écrit null sinon. */
	private static final class SerialiseurAuditReserve extends ValueSerializer<Object> {

		private final ValueSerializer<Object> standard;
		private final UtilisateurCourantService utilisateurCourant;

		@SuppressWarnings("unchecked")
		SerialiseurAuditReserve(ValueSerializer<?> standard, UtilisateurCourantService utilisateurCourant) {
			this.standard = (ValueSerializer<Object>) standard;
			this.utilisateurCourant = utilisateurCourant;
		}

		@Override
		public void serialize(Object audit, JsonGenerator generateur, SerializationContext contexte) {
			if (utilisateurCourant.estAdmin()) {
				standard.serialize(audit, generateur, contexte);
			}
			else {
				generateur.writeNull();
			}
		}

		@Override
		public void resolve(SerializationContext contexte) {
			standard.resolve(contexte);
		}

		@Override
		public ValueSerializer<?> createContextual(SerializationContext contexte, BeanProperty propriete) {
			ValueSerializer<?> contextuel = standard.createContextual(contexte, propriete);
			return contextuel == standard ? this : new SerialiseurAuditReserve(contextuel, utilisateurCourant);
		}

		@Override
		public Class<?> handledType() {
			return AuditResponse.class;
		}

	}

}
