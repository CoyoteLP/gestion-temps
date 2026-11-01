package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Classe de base de toutes les exceptions de l'application.
 * <p>
 * Chaque exception porte le code HTTP renvoyé au client : {@link GlobalExceptionHandler} la traduit
 * en réponse d'erreur sans qu'il soit nécessaire de déclarer un handler par sous-classe. Utilisée
 * directement, elle signale une erreur technique (500).
 */
public class ApplicationException extends RuntimeException {

	private final HttpStatus status;

	/**
	 * Erreur technique interne (500).
	 *
	 * @param message détail de l'erreur
	 */
	public ApplicationException(String message) {
		this(message, HttpStatus.INTERNAL_SERVER_ERROR);
	}

	/**
	 * @param message détail de l'erreur, renvoyé au client
	 * @param status  code HTTP de la réponse
	 */
	protected ApplicationException(String message, HttpStatus status) {
		super(message);
		this.status = status;
	}

	/**
	 * @return le code HTTP à renvoyer au client
	 */
	public HttpStatus getStatus() {
		return status;
	}

}
