package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsqu'une modification porte sur une version périmée de la ressource : une autre requête
 * l'a modifiée entre-temps (409).
 */
public class ModificationConcurrenteException extends ApplicationException {

	/** Message renvoyé au client, quelle que soit la façon dont le conflit a été détecté. */
	public static final String MESSAGE =
			"Les données ont été modifiées entre-temps par une autre requête : rechargez-les puis réessayez";

	/**
	 * Conflit avec le message standard {@link #MESSAGE}.
	 */
	public ModificationConcurrenteException() {
		super(MESSAGE, HttpStatus.CONFLICT);
	}

}
