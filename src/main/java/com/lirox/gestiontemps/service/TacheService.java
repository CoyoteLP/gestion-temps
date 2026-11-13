package com.lirox.gestiontemps.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.dto.PageResponse;
import com.lirox.gestiontemps.dto.PaginationRequest;
import com.lirox.gestiontemps.dto.TacheRequest;
import com.lirox.gestiontemps.dto.TacheResponse;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des tâches : rattachement à un projet existant et interdiction de supprimer une tâche qui
 * a des saisies de temps. Un collaborateur ne lit que les tâches des projets dont il est membre
 * ({@link AccesProjetService}).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TacheService {

	private final TacheRepository tacheRepository;
	private final ProjetRepository projetRepository;
	private final SaisieTempsRepository saisieTempsRepository;
	private final AccesProjetService accesProjetService;

	/**
	 * @param projetId   restreint aux tâches de ce projet ; null = toutes les tâches visibles (celles
	 *                   des projets dont un collaborateur est membre)
	 * @param pagination page demandée
	 * @return une page de tâches, par identifiant croissant
	 * @throws AccesRefuseException si un collaborateur filtre sur un projet dont il n'est pas membre
	 */
	public PageResponse<TacheResponse> findAll(Long projetId, PaginationRequest pagination) {
		PageRequest page = pagination.versPageRequest(Sort.by("id"));
		Page<Tache> taches;
		if (projetId != null) {
			accesProjetService.verifierAcces(projetId);
			taches = tacheRepository.findByProjetId(projetId, page);
		}
		else {
			Long utilisateurId = accesProjetService.utilisateurRestreint();
			taches = utilisateurId == null ? tacheRepository.findAll(page)
					: tacheRepository.findDontMembre(utilisateurId, page);
		}
		return PageResponse.from(taches, TacheResponse::from);
	}

	/**
	 * @param id identifiant de la tâche
	 * @return la tâche
	 * @throws ResourceNotFoundException si la tâche n'existe pas
	 * @throws AccesRefuseException      si l'appelant n'est ni administrateur ni membre du projet de la tâche
	 */
	public TacheResponse findById(Long id) {
		Tache tache = getTache(id);
		accesProjetService.verifierAcces(tache.getProjet().getId());
		return TacheResponse.from(tache);
	}

	/**
	 * @param request données de la tâche
	 * @return la tâche créée
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	@Transactional
	public TacheResponse create(TacheRequest request) {
		Tache tache = new Tache();
		apply(request, tache);
		return TacheResponse.from(tacheRepository.save(tache));
	}

	/**
	 * @param id      identifiant de la tâche
	 * @param request nouvelles données
	 * @return la tâche modifiée
	 * @throws ResourceNotFoundException si la tâche ou le projet n'existe pas
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public TacheResponse update(Long id, TacheRequest request) {
		Tache tache = getTache(id);
		VerrouOptimiste.verifier(tache.getVersion(), request.version());
		apply(request, tache);
		tacheRepository.flush();
		return TacheResponse.from(tache);
	}

	/**
	 * @param id identifiant de la tâche à supprimer
	 * @throws ResourceNotFoundException si la tâche n'existe pas
	 * @throws ResourceInUseException    si la tâche possède des saisies (la désactiver à la place)
	 */
	@Transactional
	public void delete(Long id) {
		Tache tache = getTache(id);
		if (saisieTempsRepository.existsByTacheId(id)) {
			throw new ResourceInUseException("La tâche possède des saisies de temps : désactivez-la plutôt");
		}
		tacheRepository.delete(tache);
	}

	/**
	 * Charge l'entité ; réservé aux autres services du paquet (ex. {@link SaisieTempsService}).
	 *
	 * @param id identifiant de la tâche
	 * @return l'entité tâche
	 * @throws ResourceNotFoundException si la tâche n'existe pas
	 */
	Tache getTache(Long id) {
		return tacheRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tâche", id));
	}

	private void apply(TacheRequest request, Tache tache) {
		Projet projet = projetRepository.findById(request.projetId())
				.orElseThrow(() -> new ResourceNotFoundException("Projet", request.projetId()));
		tache.setProjet(projet);
		tache.setLibelle(request.libelle());
		tache.setDescription(request.description());
		tache.setActif(request.actif() == null || request.actif());
	}

}
