package com.lirox.gestiontemps.validation;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import jakarta.validation.Payload;

/**
 * Vérifie le calcul du {@link PasDeValidator} indépendamment de Spring.
 */
class PasDeValidatorTest {

	private final PasDeValidator validator = new PasDeValidator();

	@BeforeEach
	void setUp() {
		validator.initialize(pas("0.5"));
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

	private static PasDe pas(String valeur) {
		return new PasDe() {

			@Override
			public String value() {
				return valeur;
			}

			@Override
			public String message() {
				return "";
			}

			@Override
			public Class<?>[] groups() {
				return new Class<?>[0];
			}

			@SuppressWarnings("unchecked")
			@Override
			public Class<? extends Payload>[] payload() {
				return new Class[0];
			}

			@Override
			public Class<PasDe> annotationType() {
				return PasDe.class;
			}

		};
	}

}
