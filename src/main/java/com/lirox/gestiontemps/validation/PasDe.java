package com.lirox.gestiontemps.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Le nombre annoté doit être un multiple exact de {@link #value()} (ex. pas de 0.5 : 1, 1.5, 2...).
 * Une valeur null est considérée comme valide : combiner avec {@code @NotNull} si nécessaire.
 * <p>
 * S'applique aux champs de type {@link java.math.BigDecimal}.
 */
@Documented
@Constraint(validatedBy = PasDeValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
public @interface PasDe {

	/**
	 * @return le pas, sous forme décimale (ex. "0.5")
	 */
	String value();

	/**
	 * @return le message d'erreur
	 */
	String message() default "doit être un multiple de {value}";

	/**
	 * @return les groupes de validation
	 */
	Class<?>[] groups() default {};

	/**
	 * @return les métadonnées associées à la contrainte
	 */
	Class<? extends Payload>[] payload() default {};

}
