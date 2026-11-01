package com.lirox.gestiontemps.controller;

import java.net.URI;
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
import com.lirox.gestiontemps.dto.TacheRequest;
import com.lirox.gestiontemps.dto.TacheResponse;
import com.lirox.gestiontemps.service.TacheService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des tâches ({@code /api/taches}).
 */
@RestController
@RequestMapping("/api/taches")
@RequiredArgsConstructor
public class TacheController {

	private final TacheService tacheService;

	/**
	 * {@code GET /api/taches?projetId=} : liste des tâches.
	 *
	 * @param projetId filtre optionnel sur le projet
	 * @return les tâches correspondantes
	 */
	@GetMapping
	public ApiResponse<List<TacheResponse>> findAll(@RequestParam(required = false) Long projetId) {
		return ApiResponse.success(tacheService.findAll(projetId));
	}

	/**
	 * {@code GET /api/taches/{id}} : détail d'une tâche.
	 *
	 * @param id identifiant de la tâche
	 * @return la tâche (404 si elle n'existe pas)
	 */
	@GetMapping("/{id}")
	public ApiResponse<TacheResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(tacheService.findById(id));
	}

	/**
	 * {@code POST /api/taches} : création d'une tâche.
	 *
	 * @param request données de la tâche
	 * @return 201 avec la tâche créée et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<TacheResponse>> create(@Valid @RequestBody TacheRequest request) {
		TacheResponse created = tacheService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code PUT /api/taches/{id}} : modification d'une tâche.
	 *
	 * @param id      identifiant de la tâche
	 * @param request nouvelles données
	 * @return la tâche modifiée
	 */
	@PutMapping("/{id}")
	public ApiResponse<TacheResponse> update(@PathVariable Long id, @Valid @RequestBody TacheRequest request) {
		return ApiResponse.success(tacheService.update(id, request));
	}

	/**
	 * {@code DELETE /api/taches/{id}} : suppression d'une tâche sans saisie.
	 *
	 * @param id identifiant de la tâche
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		tacheService.delete(id);
		return ApiResponse.success(null, "Tâche supprimée");
	}

}
