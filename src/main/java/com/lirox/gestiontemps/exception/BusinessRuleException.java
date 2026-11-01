package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsqu'une requête, bien que valide sur la forme, enfreint une règle métier (422).
 */
public class BusinessRuleException extends ApplicationException {

	/**
	 * @param message détail de l'erreur, renvoyé au client
	 */
	public BusinessRuleException(String message) {
		super(message, HttpStatus.UNPROCESSABLE_CONTENT);
	}

}
