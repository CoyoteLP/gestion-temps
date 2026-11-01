package com.lirox.gestiontemps.validation;

import java.math.BigDecimal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Vérifie la contrainte {@link PasDe} : le reste de la division par le pas doit être nul.
 */
public class PasDeValidator implements ConstraintValidator<PasDe, BigDecimal> {

	private BigDecimal pas;

	/**
	 * @param annotation contrainte portant la valeur du pas
	 */
	@Override
	public void initialize(PasDe annotation) {
		pas = new BigDecimal(annotation.value());
	}

	/**
	 * @param valeur  nombre à contrôler
	 * @param context contexte de validation
	 * @return true si la valeur est null ou un multiple exact du pas
	 */
	@Override
	public boolean isValid(BigDecimal valeur, ConstraintValidatorContext context) {
		return valeur == null || valeur.remainder(pas).signum() == 0;
	}

}
