package com.lirox.gestiontemps.validation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Vérifie le calcul du {@link PasDeValidator} indépendamment de Spring.
 */
class PasDeValidatorTest {

	/** Porte l'annotation à tester : lue par réflexion plutôt qu'implémentée à la main. */
	@PasDe("0.5")
	private BigDecimal dureeParPasDeDemiHeure;

	private final PasDeValidator validator = new PasDeValidator();

	@BeforeEach
	void setUp() throws NoSuchFieldException {
		PasDe pas = PasDeValidatorTest.class.getDeclaredField("dureeParPasDeDemiHeure").getAnnotation(PasDe.class);
		validator.initialize(pas);
	}

	@ParameterizedTest
	@ValueSource(strings = { "0", "0.5", "1", "1.0", "1.50", "24", "-0.5" })
	void accepteLesMultiplesDuPas(String valeur) {
		assertThat(validator.isValid(new BigDecimal(valeur), null)).isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = { "0.25", "0.1", "1.75", "7.49", "2.501" })
	void refuseLesValeursHorsPas(String valeur) {
		assertThat(validator.isValid(new BigDecimal(valeur), null)).isFalse();
	}

	@Test
	void accepteNull() {
		assertThat(validator.isValid(null, null)).isTrue();
	}

}
