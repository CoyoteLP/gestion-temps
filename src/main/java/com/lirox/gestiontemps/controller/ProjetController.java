package com.lirox.gestiontemps.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.lirox.gestiontemps.dto.ApiResponse;
import com.lirox.gestiontemps.dto.ProjetRequest;
import com.lirox.gestiontemps.dto.ProjetResponse;
import com.lirox.gestiontemps.service.ProjetService;
import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.Valid;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des projets ({@code /api/projets}).
 */
@RestController
@RequestMapping("/api/projets")
@RequiredArgsConstructor
public class ProjetController {

	private final ProjetService projetService;

	/**
	 * {@code GET /api/projets} : liste des projets.
	 *
	 * @return tous les projets
	 */
	@GetMapping
	public ApiResponse<List<ProjetResponse>> findAll() {
		return ApiResponse.success(projetService.findAll());
	}

	/**
	 * {@code GET /api/projets/{id}} : détail d'un projet.
	 *
	 * @param id identifiant du projet
	 * @return le projet (404 s'il n'existe pas)
	 */
	@GetMapping("/{id}")
	public ApiResponse<ProjetResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(projetService.findById(id));
	}

	/**
	 * {@code POST /api/projets} : création d'un projet.
	 *
	 * @param request données du projet
	 * @return 201 avec le projet créé et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<ProjetResponse>> create(@Valid @RequestBody ProjetRequest request) {
		ProjetResponse created = projetService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code PUT /api/projets/{id}} : modification d'un projet.
	 *
	 * @param id      identifiant du projet
	 * @param request nouvelles données, avec la version lue (400 si absente, 409 si périmée)
	 * @return le projet modifié
	 */
	@PutMapping("/{id}")
	public ApiResponse<ProjetResponse> update(@PathVariable Long id,
			@Validated({ Default.class, Modification.class }) @RequestBody ProjetRequest request) {
		return ApiResponse.success(projetService.update(id, request));
	}

	/**
	 * {@code DELETE /api/projets/{id}} : suppression d'un projet sans tâche.
	 *
	 * @param id identifiant du projet
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		projetService.delete(id);
		return ApiResponse.success(null, "Projet supprimé");
	}

}
