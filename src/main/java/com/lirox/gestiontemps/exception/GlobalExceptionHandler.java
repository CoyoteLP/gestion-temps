package com.lirox.gestiontemps.exception;

import java.util.Comparator;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.lirox.gestiontemps.dto.ApiResponse;

/**
 * Traduit toutes les exceptions (métier et Spring MVC) en réponses {@link ApiResponse} de statut "error".
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/**
	 * Toutes les exceptions de l'application : le code HTTP est porté par l'exception elle-même.
	 */
	@ExceptionHandler(ApplicationException.class)
	public ResponseEntity<ApiResponse<Void>> handleApplication(ApplicationException ex) {
		if (ex.getStatus().is5xxServerError()) {
			log.error("Erreur applicative", ex);
		}
		return error(ex.getStatus(), ex.getMessage());
	}

	/**
	 * Filet de sécurité : toute exception imprévue renvoie 500 sans exposer son détail au client.
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
		log.error("Erreur inattendue", ex);
		return error(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne du serveur");
	}

	/** Liste les champs en erreur, triés par nom : "Requête invalide : code : ne doit pas être vide ; nom : ...". */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		String details = ex.getBindingResult().getFieldErrors().stream()
				.sorted(Comparator.comparing(FieldError::getField))
				.map(e -> e.getField() + " : " + e.getDefaultMessage())
				.collect(Collectors.joining(" ; "));
		return handleExceptionInternal(ex, ProblemDetail.forStatusAndDetail(status, "Requête invalide : " + details),
				headers, status, request);
	}

	/** Corps de requête absent ou JSON mal formé : message en français plutôt que le détail technique. */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return handleExceptionInternal(ex, ProblemDetail.forStatusAndDetail(status, "Corps de requête JSON invalide"),
				headers, status, request);
	}

	/** Point de passage de toutes les exceptions Spring MVC : remplace le ProblemDetail par une ApiResponse. */
	@Override
	protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode statusCode,
			WebRequest request) {
		String message = body instanceof ProblemDetail problem ? problem.getDetail() : null;
		return new ResponseEntity<>(ApiResponse.error(message), headers, statusCode);
	}

	private static ResponseEntity<ApiResponse<Void>> error(HttpStatus status, String message) {
		return ResponseEntity.status(status).body(ApiResponse.error(message));
	}

}
