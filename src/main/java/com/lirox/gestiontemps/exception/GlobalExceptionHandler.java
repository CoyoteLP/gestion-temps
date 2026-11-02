package com.lirox.gestiontemps.exception;

import java.util.Comparator;
import java.util.stream.Collectors;

import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.lirox.gestiontemps.dto.ApiResponse;

/**
 * Traduit toutes les exceptions (métier et Spring MVC) en réponses {@link ApiResponse} de statut "error".
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/**
	 * Toutes les exceptions de l'application : le code HTTP est porté par l'exception elle-même.
	 *
	 * @param ex exception levée par un service
	 * @return la réponse d'erreur, avec le code HTTP de l'exception
	 */
	@ExceptionHandler(ApplicationException.class)
	public ResponseEntity<ApiResponse<Void>> handleApplication(ApplicationException ex) {
		if (ex.getStatus().is5xxServerError()) {
			log.error("Erreur applicative", ex);
		}
		return error(ex.getStatus(), ex.getMessage());
	}

	/**
	 * Contrainte de base de données enfreinte malgré les contrôles des services : en pratique, deux
	 * requêtes simultanées (même code créé deux fois, suppression d'une ressource pendant qu'on la
	 * référence). 409 sans exposer le détail SQL.
	 *
	 * @param ex violation remontée par la base
	 * @return 409 avec un message destiné à l'utilisateur
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
		// Seul le nom de la contrainte est journalisé : le message de la base contient la valeur en
		// cause (email, code…), donnée potentiellement personnelle
		log.warn("Contrainte de base de données enfreinte : {}", nomContrainte(ex));
		return error(HttpStatus.CONFLICT,
				"L'opération entre en conflit avec des données existantes : rechargez-les puis réessayez");
	}

	/**
	 * Verrou en écriture non obtenu dans le délai imparti (ex.
	 * {@link com.lirox.gestiontemps.common.Constantes#DELAI_VERROU_UTILISATEUR_MS}) : une autre
	 * requête modifie les mêmes données depuis trop longtemps.
	 *
	 * @param ex échec d'acquisition du verrou
	 * @return 409 invitant à réessayer
	 */
	@ExceptionHandler(PessimisticLockingFailureException.class)
	public ResponseEntity<ApiResponse<Void>> handlePessimisticLocking(PessimisticLockingFailureException ex) {
		log.warn("Verrou non obtenu dans le délai : {}", ex.getClass().getSimpleName());
		return error(HttpStatus.CONFLICT,
				"Ces données sont en cours de modification par une autre requête : réessayez dans quelques instants");
	}

	/**
	 * Deux modifications simultanées de la même ligne : la seconde écriture est refusée par le
	 * {@code @Version} de l'entité.
	 *
	 * @param ex conflit détecté par Hibernate à l'écriture
	 * @return 409 avec le même message qu'une version périmée envoyée par le client
	 */
	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	public ResponseEntity<ApiResponse<Void>> handleOptimisticLocking(ObjectOptimisticLockingFailureException ex) {
		return error(HttpStatus.CONFLICT, ModificationConcurrenteException.MESSAGE);
	}

	/**
	 * Requête sans jeton, ou jeton invalide ou expiré (relayée par le point d'entrée de Spring Security).
	 *
	 * @param ex échec d'authentification
	 * @return 401 avec un message destiné à l'utilisateur
	 */
	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
		return error(HttpStatus.UNAUTHORIZED, "Authentification requise : jeton absent, invalide ou expiré");
	}

	/**
	 * Rôle insuffisant pour l'URL demandée (ex. écriture d'un projet sans le rôle administrateur),
	 * relayé par Spring Security.
	 *
	 * @param ex refus d'accès
	 * @return 403 avec un message destiné à l'utilisateur
	 */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
		return error(HttpStatus.FORBIDDEN, "Accès refusé : cette opération est réservée aux administrateurs");
	}

	/**
	 * Filet de sécurité : toute exception imprévue renvoie 500 sans exposer son détail au client.
	 *
	 * @param ex exception imprévue
	 * @return 500 avec un message générique
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
		log.error("Erreur inattendue", ex);
		return error(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne du serveur");
	}

	/**
	 * Liste les champs en erreur, triés par nom : "Requête invalide : code : ne doit pas être vide ; nom : ...".
	 * Une valeur impossible à convertir (paramètre {@code ?du=abc}) est signalée « format invalide ».
	 */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		String details = ex.getBindingResult().getFieldErrors().stream()
				.sorted(Comparator.comparing(FieldError::getField))
				.map(e -> e.getField() + " : " + (e.isBindingFailure() ? "format invalide" : e.getDefaultMessage()))
				.collect(Collectors.joining(" ; "));
		return detail(ex, "Requête invalide : " + details, headers, status, request);
	}

	/** Corps de requête absent ou JSON mal formé : message en français plutôt que le détail technique. */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return detail(ex, "Corps de requête JSON invalide", headers, status, request);
	}

	/** Paramètre d'URL ou de chemin au mauvais format (ex. {@code /api/projets/abc}). */
	@Override
	protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		return detail(ex, "Paramètre invalide : '" + ex.getPropertyName() + "' n'a pas le format attendu", headers,
				status, request);
	}

	/** Méthode HTTP non prévue pour l'URL ; l'en-tête {@code Allow} liste les méthodes possibles. */
	@Override
	protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return detail(ex, "La méthode " + ex.getMethod() + " n'est pas autorisée sur cette URL", headers, status,
				request);
	}

	/** Corps envoyé dans un autre format que JSON. */
	@Override
	protected ResponseEntity<Object> handleHttpMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return detail(ex, "Type de contenu non supporté : le corps doit être envoyé en application/json", headers,
				status, request);
	}

	/** URL ne correspondant à aucun endpoint. */
	@Override
	protected ResponseEntity<Object> handleNoResourceFoundException(NoResourceFoundException ex, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		return detail(ex, "URL inconnue : /" + ex.getResourcePath(), headers, status, request);
	}

	/** Point de passage de toutes les exceptions Spring MVC : remplace le ProblemDetail par une ApiResponse. */
	@Override
	protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode statusCode,
			WebRequest request) {
		String message = body instanceof ProblemDetail problem ? problem.getDetail() : null;
		return new ResponseEntity<>(ApiResponse.error(message), headers, statusCode);
	}

	private ResponseEntity<Object> detail(Exception ex, String message, HttpHeaders headers, HttpStatusCode status,
			WebRequest request) {
		return handleExceptionInternal(ex, ProblemDetail.forStatusAndDetail(status, message), headers, status, request);
	}

	/** Nom de la contrainte enfreinte, extrait par Hibernate ; "inconnue" s'il n'est pas disponible. */
	private static String nomContrainte(DataIntegrityViolationException ex) {
		if (ex.getCause() instanceof ConstraintViolationException violation && violation.getConstraintName() != null) {
			return violation.getConstraintName();
		}
		return "inconnue";
	}

	private static ResponseEntity<ApiResponse<Void>> error(HttpStatus status, String message) {
		return ResponseEntity.status(status).body(ApiResponse.error(message));
	}

}
