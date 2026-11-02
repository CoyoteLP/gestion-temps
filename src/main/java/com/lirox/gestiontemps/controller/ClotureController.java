package com.lirox.gestiontemps.controller;

import java.net.URI;
import java.time.YearMonth;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.lirox.gestiontemps.dto.ApiResponse;
import com.lirox.gestiontemps.dto.ClotureRequest;
import com.lirox.gestiontemps.dto.ClotureResponse;
import com.lirox.gestiontemps.dto.ClotureTousProjetsRequest;
import com.lirox.gestiontemps.service.ClotureService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Endpoints REST des clôtures mensuelles ({@code /api/clotures}). Lecture pour tout utilisateur
 * authentifié ; clôture par un administrateur ou un membre du projet ; réouverture (suppression)
 * réservée aux administrateurs.
 */
@RestController
@RequestMapping("/api/clotures")
@RequiredArgsConstructor
public class ClotureController {

	private final ClotureService clotureService;

	/**
	 * {@code GET /api/clotures?projetId=&mois=} : recherche de clôtures.
	 *
	 * @param projetId filtre optionnel sur le projet
	 * @param mois     filtre optionnel sur le mois (format AAAA-MM)
	 * @return les clôtures correspondantes, du mois le plus récent au plus ancien
	 */
	@GetMapping
	public ApiResponse<List<ClotureResponse>> search(@RequestParam(required = false) Long projetId,
			@RequestParam(required = false) YearMonth mois) {
		return ApiResponse.success(clotureService.search(projetId, mois));
	}

	/**
	 * {@code GET /api/clotures/{id}} : détail d'une clôture.
	 *
	 * @param id identifiant de la clôture
	 * @return la clôture (404 si elle n'existe pas)
	 */
	@GetMapping("/{id}")
	public ApiResponse<ClotureResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(clotureService.findById(id));
	}

	/**
	 * {@code POST /api/clotures} : clôture d'un mois terminé pour un projet.
	 *
	 * @param request projet et mois
	 * @return 201 avec la clôture créée et l'en-tête {@code Location}
	 */
	@PostMapping
	public ResponseEntity<ApiResponse<ClotureResponse>> create(@Valid @RequestBody ClotureRequest request) {
		ClotureResponse created = clotureService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}").buildAndExpand(created.id()).toUri();
		return ResponseEntity.created(location).body(ApiResponse.success(created));
	}

	/**
	 * {@code POST /api/clotures/tous-projets} : clôture d'un mois terminé pour tous les projets actifs
	 * qui ne le sont pas encore (administrateur). Plusieurs ressources créées : 201 sans
	 * {@code Location}.
	 *
	 * @param request mois à clôturer
	 * @return 201 avec les clôtures créées (liste vide si aucune n'était à créer)
	 */
	@PostMapping("/tous-projets")
	public ResponseEntity<ApiResponse<List<ClotureResponse>>> cloturerTousLesProjets(
			@Valid @RequestBody ClotureTousProjetsRequest request) {
		List<ClotureResponse> creees = clotureService.cloturerTousLesProjets(request.mois());
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ApiResponse.success(creees, creees.size() + " projet(s) clôturé(s) pour " + request.mois()));
	}

	/**
	 * {@code DELETE /api/clotures/{id}} : réouverture du mois (administrateur).
	 *
	 * @param id identifiant de la clôture
	 * @return une réponse sans données avec un message de confirmation
	 */
	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		clotureService.delete(id);
		return ApiResponse.success(null, "Clôture supprimée : le mois est rouvert");
	}

}
