package com.lirox.gestiontemps.controller;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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
import com.lirox.gestiontemps.dto.PageResponse;
import com.lirox.gestiontemps.dto.PaginationRequest;
import com.lirox.gestiontemps.dto.ProfilRequest;
import com.lirox.gestiontemps.dto.UtilisateurRequest;
import com.lirox.gestiontemps.dto.UtilisateurResponse;
import com.lirox.gestiontemps.service.UtilisateurService;
import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.Valid;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des utilisateurs ({@code /api/utilisateurs}) : gestion des fiches, réservée à
 * l'administrateur, et fiche de l'utilisateur connecté ({@code /api/utilisateurs/moi}).
 */
@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

	private final UtilisateurService utilisateurService;

	/**
	 * {@code GET /api/utilisateurs} : liste des utilisateurs.
	 *
	 * @param actif      filtre facultatif sur l'état ({@code false} : comptes en attente de
	 *                   validation ou désactivés)
	 * @param pagination page demandée
	 * @return une page d'utilisateurs
	 */
	@GetMapping
	public ApiResponse<PageResponse<UtilisateurResponse>> findAll(@RequestParam(required = false) Boolean actif,
			@Valid PaginationRequest pagination) {
		return ApiResponse.success(utilisateurService.findAll(actif, pagination));
	}

	/**
	 * {@code GET /api/utilisateurs/moi} : fiche de l'utilisateur connecté, active ou non.
	 *
	 * @return la fiche (404 si l'utilisateur ne l'a pas encore créée)
	 */
	@GetMapping("/moi")
	public ApiResponse<UtilisateurResponse> findMoi() {
		return ApiResponse.success(utilisateurService.findMoi());
	}

	/**
	 * {@code POST /api/utilisateurs/moi} : inscription, création de la fiche de l'utilisateur
	 * connecté à partir de son jeton ; elle reste inactive jusqu'à sa validation par un administrateur.
	 *
	 * @return 201 avec la fiche créée et l'en-tête {@code Location}
	 */
	@PostMapping("/moi")
	public ResponseEntity<ApiResponse<UtilisateurResponse>> createMoi() {
		UtilisateurResponse created = utilisateurService.createMoi();
		URI location = ServletUriComponentsBuilder.fromCurrentRequest().build().toUri();
		return ResponseEntity.created(location)
				.body(ApiResponse.success(created, "Compte enregistré : il sera actif après validation par un administrateur"));
	}

	/**
	 * {@code PUT /api/utilisateurs/moi} : modification du nom et du prénom de l'utilisateur connecté.
	 *
	 * @param request nouveau nom et prénom, avec la version lue (400 si absente, 409 si périmée)
	 * @return la fiche modifiée
	 */
	@PutMapping("/moi")
	public ApiResponse<UtilisateurResponse> updateMoi(
			@Validated({ Default.class, Modification.class }) @RequestBody ProfilRequest request) {
		return ApiResponse.success(utilisateurService.updateMoi(request));
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
	 * @param request nouvelles données, avec la version lue (400 si absente, 409 si périmée)
	 * @return l'utilisateur modifié
	 */
	@PutMapping("/{id}")
	public ApiResponse<UtilisateurResponse> update(@PathVariable Long id,
			@Validated({ Default.class, Modification.class }) @RequestBody UtilisateurRequest request) {
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
