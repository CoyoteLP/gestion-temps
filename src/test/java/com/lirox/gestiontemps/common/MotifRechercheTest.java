package com.lirox.gestiontemps.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class MotifRechercheTest {

	@Test
	void contientEntoureLaSaisieNettoyeeDeJokers() {
		assertThat(MotifRecherche.contient("  Équipe ")).isEqualTo("%Équipe%");
	}

	@Test
	void contientEchappeLesJokersEtLeCaractereDEchappement() {
		assertThat(MotifRecherche.contient("100%_a!b")).isEqualTo("%100!%!_a!!b%");
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   " })
	void contientIgnoreUneSaisieVide(String saisie) {
		assertThat(MotifRecherche.contient(saisie)).isNull();
	}

}
