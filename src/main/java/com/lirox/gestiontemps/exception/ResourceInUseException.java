package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsqu'une ressource ne peut être supprimée car d'autres en dépendent (409).
 */
public class ResourceInUseException extends ApplicationException {

	/**
	 * @param message détail de l'erreur, renvoyé au client
	 */
	public ResourceInUseException(String message) {
		super(message, HttpStatus.CONFLICT);
	}

}
