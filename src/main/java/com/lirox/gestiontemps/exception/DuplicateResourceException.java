package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsqu'une création ou modification enfreindrait une contrainte d'unicité (409).
 */
public class DuplicateResourceException extends ApplicationException {

	/**
	 * @param message détail de l'erreur, renvoyé au client
	 */
	public DuplicateResourceException(String message) {
		super(message, HttpStatus.CONFLICT);
	}

}
