package com.lirox.gestiontemps.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.dto.MembreProjetRequest;
import com.lirox.gestiontemps.dto.MembreProjetResponse;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.MembreProjetRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des membres d'un projet : un utilisateur est membre d'un projet au plus une fois, avec un
 * rôle qui lui donne accès aux saisies du projet.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MembreProjetService {

	private final MembreProjetRepository membreProjetRepository;
	private final ProjetService projetService;
	private final UtilisateurService utilisateurService;

	/**
	 * @param projetId identifiant du projet
	 * @return les membres du projet
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	public List<MembreProjetResponse> findAll(Long projetId) {
		projetService.getProjet(projetId);
		return membreProjetRepository.findByProjetIdOrderById(projetId).stream().map(MembreProjetResponse::from)
				.toList();
	}

	/**
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre
	 * @return le membre
	 * @throws ResourceNotFoundException si le membre n'existe pas dans ce projet
	 */
	public MembreProjetResponse findById(Long projetId, Long id) {
		return MembreProjetResponse.from(getMembre(projetId, id));
	}

	/**
	 * @param projetId identifiant du projet
	 * @param request  données du membre
	 * @return le membre ajouté
	 * @throws ResourceNotFoundException  si le projet ou l'utilisateur n'existe pas
	 * @throws DuplicateResourceException si l'utilisateur est déjà membre du projet
	 */
	@Transactional
	public MembreProjetResponse create(Long projetId, MembreProjetRequest request) {
		Projet projet = projetService.getProjet(projetId);
		if (membreProjetRepository.existsByProjetIdAndUtilisateurId(projetId, request.utilisateurId())) {
			throw dejaMembre();
		}
		MembreProjet membre = new MembreProjet();
		membre.setProjet(projet);
		apply(request, membre);
		return MembreProjetResponse.from(membreProjetRepository.save(membre));
	}

	/**
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre
	 * @param request  nouvelles données
	 * @return le membre modifié
	 * @throws ResourceNotFoundException        si le membre (dans ce projet) ou l'utilisateur n'existe pas
	 * @throws DuplicateResourceException       si l'utilisateur est déjà membre du projet
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public MembreProjetResponse update(Long projetId, Long id, MembreProjetRequest request) {
		MembreProjet membre = getMembre(projetId, id);
		VerrouOptimiste.verifier(membre.getVersion(), request.version());
		if (membreProjetRepository.existsByProjetIdAndUtilisateurIdAndIdNot(projetId, request.utilisateurId(), id)) {
			throw dejaMembre();
		}
		apply(request, membre);
		membreProjetRepository.flush();
		return MembreProjetResponse.from(membre);
	}

	/**
	 * @param projetId identifiant du projet
	 * @param id       identifiant du membre à retirer
	 * @throws ResourceNotFoundException si le membre n'existe pas dans ce projet
	 */
	@Transactional
	public void delete(Long projetId, Long id) {
		membreProjetRepository.delete(getMembre(projetId, id));
	}

	/**
	 * Réservé aux autres services du paquet : droit d'accès aux saisies d'un projet.
	 *
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur est membre du projet, quel que soit son rôle
	 */
	boolean estMembre(Long projetId, Long utilisateurId) {
		return membreProjetRepository.existsByProjetIdAndUtilisateurId(projetId, utilisateurId);
	}

	private MembreProjet getMembre(Long projetId, Long id) {
		return membreProjetRepository.findByIdAndProjetId(id, projetId)
				.orElseThrow(() -> new ResourceNotFoundException("Membre du projet", id));
	}

	private void apply(MembreProjetRequest request, MembreProjet membre) {
		membre.setUtilisateur(utilisateurService.getUtilisateur(request.utilisateurId()));
		membre.setRole(request.role());
	}

	private static DuplicateResourceException dejaMembre() {
		return new DuplicateResourceException("L'utilisateur est déjà membre de ce projet");
	}

}
