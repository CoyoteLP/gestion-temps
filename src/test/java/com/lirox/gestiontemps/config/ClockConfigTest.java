package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

import com.lirox.gestiontemps.common.Constantes;

/**
 * Vérifie que la date du jour suit le fuseau de référence et non celui du serveur.
 */
class ClockConfigTest {

	private final Clock clock = new ClockConfig().clock();

	@Test
	void lHorlogeEstDansLeFuseauDeReference() {
		assertThat(clock.getZone()).isEqualTo(ZoneId.of(Constantes.FUSEAU_HORAIRE));
	}

	@Test
	void unePeuApresMinuitAParisEstDejaLeLendemain() {
		// 22 h 30 UTC le 14 juin = 0 h 30 à Paris (heure d'été) le 15 juin
		Clock aMinuitTrente = Clock.fixed(Instant.parse("2026-06-14T22:30:00Z"), clock.getZone());
		assertThat(LocalDate.now(aMinuitTrente)).isEqualTo(LocalDate.of(2026, 6, 15));
	}

	@Test
	void justeAvantMinuitAParisEstEncoreLeJourMeme() {
		// 21 h 59 UTC le 14 juin = 23 h 59 à Paris le 14 juin
		Clock avantMinuit = Clock.fixed(Instant.parse("2026-06-14T21:59:00Z"), clock.getZone());
		assertThat(LocalDate.now(avantMinuit)).isEqualTo(LocalDate.of(2026, 6, 14));
	}

}
