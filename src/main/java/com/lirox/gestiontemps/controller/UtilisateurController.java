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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.lirox.gestiontemps.dto.ApiResponse;
import com.lirox.gestiontemps.dto.UtilisateurRequest;
import com.lirox.gestiontemps.dto.UtilisateurResponse;
import com.lirox.gestiontemps.service.UtilisateurService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des utilisateurs ({@code /api/utilisateurs}).
 */
@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

	private final UtilisateurService utilisateurService;

	/**
	 * {@code GET /api/utilisateurs} : liste des utilisateurs.
	 *
	 * @return tous les utilisateurs
	 */
	@GetMapping
	public ApiResponse<List<UtilisateurResponse>> findAll() {
		return ApiResponse.success(utilisateurService.findAll());
	}

	/**
	 * {@code GET /api/utilisateurs/{id}} : détail d'un utilisateur.
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'utilisateur (404 s'il n'existe pas)
	 */
	@GetMapping("/{id}")
	public ApiResponse<UtilisateurResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(utilisateurService.findById(id));
	}

	/**
	 * {@code POST /api/utilisateurs} : création d'un utilisateur.
	 *
	 * @param request données de l'utilisateur
	 * @return 201 avec l'utilisateur créé et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<UtilisateurResponse>> create(@Valid @RequestBody UtilisateurRequest request) {
		UtilisateurResponse created = utilisateurService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code PUT /api/utilisateurs/{id}} : modification d'un utilisateur.
	 *
	 * @param id      identifiant de l'utilisateur
	 * @param request nouvelles données
	 * @return l'utilisateur modifié
	 */
	@PutMapping("/{id}")
	public ApiResponse<UtilisateurResponse> update(@PathVariable Long id,
			@Valid @RequestBody UtilisateurRequest request) {
		return ApiResponse.success(utilisateurService.update(id, request));
	}

	/**
	 * {@code DELETE /api/utilisateurs/{id}} : suppression d'un utilisateur sans saisie.
	 *
	 * @param id identifiant de l'utilisateur
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		utilisateurService.delete(id);
		return ApiResponse.success(null, "Utilisateur supprimé");
	}

}
