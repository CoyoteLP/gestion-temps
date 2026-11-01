package com.lirox.gestiontemps.dto;

/**
 * Enveloppe commune à toutes les réponses de l'API.
 *
 * @param status  "success" ou "error"
 * @param data    contenu de la réponse (null en cas d'erreur)
 * @param message information complémentaire ou détail de l'erreur
 * @param <T>     type des données renvoyées
 */
public record ApiResponse<T>(
		String status,
		T data,
		String message) {

	/** Valeur de {@code status} pour une réponse en succès. */
	public static final String SUCCESS = "success";

	/** Valeur de {@code status} pour une réponse en erreur. */
	public static final String ERROR = "error";

	/**
	 * @param data contenu de la réponse
	 * @return une réponse en succès, sans message
	 */
	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(SUCCESS, data, null);
	}

	/**
	 * @param data    contenu de la réponse (peut être null, ex. après une suppression)
	 * @param message information complémentaire
	 * @return une réponse en succès avec message
	 */
	public static <T> ApiResponse<T> success(T data, String message) {
		return new ApiResponse<>(SUCCESS, data, message);
	}

	/**
	 * @param message détail de l'erreur
	 * @return une réponse en erreur, sans données
	 */
	public static ApiResponse<Void> error(String message) {
		return new ApiResponse<>(ERROR, null, message);
	}

}
