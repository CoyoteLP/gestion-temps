package com.lirox.gestiontemps.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Horloge de l'application, injectée là où la date courante est nécessaire plutôt que d'appeler
 * {@code LocalDate.now()} : les tests peuvent ainsi la remplacer par une horloge fixe.
 */
@Configuration
public class ClockConfig {

	/**
	 * @return l'horloge système, dans le fuseau horaire par défaut du serveur
	 */
	@Bean
	public Clock clock() {
		return Clock.systemDefaultZone();
	}

}
