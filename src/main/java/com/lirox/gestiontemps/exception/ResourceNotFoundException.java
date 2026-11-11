package com.lirox.gestiontemps.exception;

import org.springframework.http.HttpStatus;

/**
 * Levée lorsqu'une ressource demandée n'existe pas (404).
 */
public class ResourceNotFoundException extends ApplicationException {

	/**
	 * @param resource nom de la ressource, affiché dans le message (ex. "Projet")
	 * @param id       identifiant recherché
	 */
	public ResourceNotFoundException(String resource, Object id) {
		super(resource + " introuvable (id=" + id + ")", HttpStatus.NOT_FOUND);
	}

	/**
	 * Ressource qui ne se désigne pas par un identifiant (ex. la fiche de l'utilisateur connecté).
	 *
	 * @param message message affiché à l'utilisateur
	 */
	public ResourceNotFoundException(String message) {
		super(message, HttpStatus.NOT_FOUND);
	}

}
