package com.lirox.gestiontemps.controller;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.lirox.gestiontemps.dto.ApiResponse;
import com.lirox.gestiontemps.dto.SaisieTempsRequest;
import com.lirox.gestiontemps.dto.SaisieTempsResponse;
import com.lirox.gestiontemps.service.SaisieTempsService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des saisies de temps ({@code /api/saisies-temps}).
 */
@RestController
@RequestMapping("/api/saisies-temps")
@RequiredArgsConstructor
public class SaisieTempsController {

	private final SaisieTempsService saisieTempsService;

	/**
	 * {@code GET /api/saisies-temps?utilisateurId=&tacheId=&du=&au=} : recherche de saisies.
	 *
	 * @param utilisateurId filtre optionnel sur l'utilisateur
	 * @param tacheId       filtre optionnel sur la tâche
	 * @param du            filtre optionnel : à partir de ce jour (inclus, format AAAA-MM-JJ)
	 * @param au            filtre optionnel : jusqu'à ce jour (inclus, format AAAA-MM-JJ)
	 * @return les saisies correspondantes, triées par jour
	 */
	@GetMapping
	public ApiResponse<List<SaisieTempsResponse>> search(
			@RequestParam(required = false) Long utilisateurId,
			@RequestParam(required = false) Long tacheId,
			@RequestParam(required = false) LocalDate du,
			@RequestParam(required = false) LocalDate au) {
		return ApiResponse.success(saisieTempsService.search(utilisateurId, tacheId, du, au));
	}

	/**
	 * {@code GET /api/saisies-temps/{id}} : détail d'une saisie.
	 *
	 * @param id identifiant de la saisie
	 * @return la saisie (404 si elle n'existe pas)
	 */
	@GetMapping("/{id}")
	public ApiResponse<SaisieTempsResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(saisieTempsService.findById(id));
	}

	/**
	 * {@code POST /api/saisies-temps} : création d'une saisie (422 si une règle métier est enfreinte).
	 *
	 * @param request données de la saisie
	 * @return 201 avec la saisie créée et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<SaisieTempsResponse>> create(@Valid @RequestBody SaisieTempsRequest request) {
		SaisieTempsResponse created = saisieTempsService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code PUT /api/saisies-temps/{id}} : modification d'une saisie (422 si une règle métier est enfreinte).
	 *
	 * @param id      identifiant de la saisie
	 * @param request nouvelles données
	 * @return la saisie modifiée
	 */
	@PutMapping("/{id}")
	public ApiResponse<SaisieTempsResponse> update(@PathVariable Long id,
			@Valid @RequestBody SaisieTempsRequest request) {
		return ApiResponse.success(saisieTempsService.update(id, request));
	}

	/**
	 * {@code DELETE /api/saisies-temps/{id}} : suppression d'une saisie.
	 *
	 * @param id identifiant de la saisie
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		saisieTempsService.delete(id);
		return ApiResponse.success(null, "Saisie de temps supprimée");
	}

}
