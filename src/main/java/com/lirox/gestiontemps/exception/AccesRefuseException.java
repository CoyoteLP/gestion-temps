package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsque l'appelant authentifié n'a pas le droit d'effectuer l'opération demandée (403) :
 * saisie d'un autre utilisateur, compte non rattaché ou désactivé…
 */
public class AccesRefuseException extends ApplicationException {

	/**
	 * @param message détail de l'erreur, renvoyé au client
	 */
	public AccesRefuseException(String message) {
		super(message, HttpStatus.FORBIDDEN);
	}

}
