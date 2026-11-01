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
import com.lirox.gestiontemps.dto.MembreProjetRequest;
import com.lirox.gestiontemps.dto.MembreProjetResponse;
import com.lirox.gestiontemps.service.MembreProjetService;
import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.Valid;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des membres d'un projet ({@code /api/projets/{projetId}/membres}). Lecture pour
 * tout utilisateur authentifié, écritures réservées aux administrateurs ({@code SecurityConfig}).
 */
@RestController
@RequestMapping("/api/projets/{projetId}/membres")
@RequiredArgsConstructor
public class MembreProjetController {

	private final MembreProjetService membreProjetService;

	/**
	 * {@code GET /api/projets/{projetId}/membres} : membres du projet.
	 *
	 * @param projetId identifiant du projet
	 * @return les membres du projet (404 si le projet n'existe pas)
	 */
	@GetMapping
	public ApiResponse<List<MembreProjetResponse>> findAll(@PathVariable Long projetId) {
		return ApiResponse.success(membreProjetService.findAll(projetId));
	}

	/**
	 * {@code GET /api/projets/{projetId}/membres/{id}} : détail d'un membre.
	 *
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre
	 * @return le membre (404 s'il n'existe pas dans ce projet)
	 */
	@GetMapping("/{id}")
	public ApiResponse<MembreProjetResponse> findById(@PathVariable Long projetId, @PathVariable Long id) {
		return ApiResponse.success(membreProjetService.findById(projetId, id));
	}

	/**
	 * {@code POST /api/projets/{projetId}/membres} : ajout d'un membre.
	 *
	 * @param projetId identifiant du projet
	 * @param request  utilisateur et rôle
	 * @return 201 avec le membre ajouté et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<MembreProjetResponse>> create(@PathVariable Long projetId,
			@Valid @RequestBody MembreProjetRequest request) {
		MembreProjetResponse created = membreProjetService.create(projetId, request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code PUT /api/projets/{projetId}/membres/{id}} : modification d'un membre (rôle, utilisateur).
	 *
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre
	 * @param request  nouvelles données, avec la version lue (400 si absente, 409 si périmée)
	 * @return le membre modifié
	 */
	@PutMapping("/{id}")
	public ApiResponse<MembreProjetResponse> update(@PathVariable Long projetId, @PathVariable Long id,
			@Validated({ Default.class, Modification.class }) @RequestBody MembreProjetRequest request) {
		return ApiResponse.success(membreProjetService.update(projetId, id, request));
	}

	/**
	 * {@code DELETE /api/projets/{projetId}/membres/{id}} : retrait d'un membre.
	 *
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long projetId, @PathVariable Long id) {
		membreProjetService.delete(projetId, id);
		return ApiResponse.success(null, "Membre retiré du projet");
	}

}
