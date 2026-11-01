package com.lirox.gestiontemps.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLIntegrityConstraintViolationException;

import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.dto.ApiResponse;

/**
 * Vérifie le code HTTP et le message de chaque type d'erreur, et ce qui en est journalisé.
 */
@ExtendWith(OutputCaptureExtension.class)
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
		assertThat(handler.handleApplication(new ModificationConcurrenteException()).getStatusCode())
				.isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void violationDIntegriteRenvoie409SansDetailTechnique() {
		DataIntegrityViolationException ex = new DataIntegrityViolationException("could not execute statement",
				new SQLIntegrityConstraintViolationException("Duplicate entry 'PRJ-01' for key 'uk_projet_code'"));
		ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrity(ex);
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody().message())
				.isEqualTo("L'opération entre en conflit avec des données existantes : rechargez-les puis réessayez")
				.doesNotContain("uk_projet_code");
	}

	@Test
	void violationDIntegriteNeJournaliseQueLeNomDeLaContrainte(CapturedOutput sortie) {
		String messageBase = "Duplicate entry 'jdupont@lirox.com' for key 'uk_utilisateur_email'";
		DataIntegrityViolationException ex = new DataIntegrityViolationException("could not execute statement",
				new ConstraintViolationException(messageBase, new SQLIntegrityConstraintViolationException(messageBase),
						"uk_utilisateur_email"));
		handler.handleDataIntegrity(ex);
		assertThat(sortie.getOut()).contains("Contrainte de base de données enfreinte : uk_utilisateur_email")
				.doesNotContain("jdupont@lirox.com");
	}

	@Test
	void verrouNonObtenuDansLeDelaiRenvoie409() {
		ResponseEntity<ApiResponse<Void>> response = handler
				.handlePessimisticLocking(new CannotAcquireLockException("Lock wait timeout exceeded"));
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody().message()).isEqualTo(
				"Ces données sont en cours de modification par une autre requête : réessayez dans quelques instants");
	}

	@Test
	void conflitDeVersionALEcritureRenvoie409() {
		ResponseEntity<ApiResponse<Void>> response = handler
				.handleOptimisticLocking(new ObjectOptimisticLockingFailureException(Projet.class, 1L));
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(response.getBody()).isEqualTo(ApiResponse.error(ModificationConcurrenteException.MESSAGE));
	}

}
