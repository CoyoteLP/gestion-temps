package com.lirox.gestiontemps.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.lirox.gestiontemps.dto.ApiResponse;

/**
 * Vérifie que le code HTTP de la réponse est celui porté par l'{@link ApplicationException}.
 */
class GlobalExceptionHandlerTest {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

	@Test
	void applicationExceptionDirecteRenvoie500() {
		ResponseEntity<ApiResponse<Void>> response = handler.handleApplication(new ApplicationException("Panne"));
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
		assertThat(response.getBody()).isEqualTo(ApiResponse.error("Panne"));
	}

	@Test
	void chaqueSousClasseRenvoieSonCodeHttp() {
		assertThat(handler.handleApplication(new ResourceNotFoundException("Projet", 1)).getStatusCode())
				.isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(handler.handleApplication(new DuplicateResourceException("x")).getStatusCode())
				.isEqualTo(HttpStatus.CONFLICT);
		assertThat(handler.handleApplication(new ResourceInUseException("x")).getStatusCode())
				.isEqualTo(HttpStatus.CONFLICT);
		assertThat(handler.handleApplication(new BusinessRuleException("x")).getStatusCode())
				.isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
	}

}
