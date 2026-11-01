package com.lirox.gestiontemps.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.lirox.gestiontemps.common.Constantes;

/**
 * Horloge de l'application, injectée là où la date courante est nécessaire plutôt que d'appeler
 * {@code LocalDate.now()} : les tests peuvent ainsi la remplacer par une horloge fixe.
 */
@Configuration
public class ClockConfig {

	/**
	 * @return l'horloge système dans le fuseau {@link Constantes#FUSEAU_HORAIRE}, quel que soit celui
	 *         du serveur : une saisie faite à 0 h 30 à Paris est datée du jour même
	 */
	@Bean
	public Clock clock() {
		return Clock.system(ZoneId.of(Constantes.FUSEAU_HORAIRE));
	}

}
