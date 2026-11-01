package com.lirox.gestiontemps.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.dto.ProjetRequest;
import com.lirox.gestiontemps.dto.ProjetResponse;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.TacheRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des projets : unicité du code et interdiction de supprimer un projet qui a des tâches.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjetService {

	private final ProjetRepository projetRepository;
	private final TacheRepository tacheRepository;

	/**
	 * @return tous les projets
	 */
	public List<ProjetResponse> findAll() {
		return projetRepository.findAll().stream().map(ProjetResponse::from).toList();
	}

	/**
	 * @param id identifiant du projet
	 * @return le projet
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	public ProjetResponse findById(Long id) {
		return ProjetResponse.from(getProjet(id));
	}

	/**
	 * @param request données du projet
	 * @return le projet créé
	 * @throws DuplicateResourceException si le code est déjà utilisé
	 */
	@Transactional
	public ProjetResponse create(ProjetRequest request) {
		if (projetRepository.existsByCode(request.code())) {
			throw codeDejaUtilise(request.code());
		}
		Projet projet = new Projet();
		apply(request, projet);
		return ProjetResponse.from(projetRepository.save(projet));
	}

	/**
	 * @param id      identifiant du projet
	 * @param request nouvelles données
	 * @return le projet modifié
	 * @throws ResourceNotFoundException  si le projet n'existe pas
	 * @throws DuplicateResourceException si le code est déjà utilisé par un autre projet
	 */
	@Transactional
	public ProjetResponse update(Long id, ProjetRequest request) {
		Projet projet = getProjet(id);
		if (projetRepository.existsByCodeAndIdNot(request.code(), id)) {
			throw codeDejaUtilise(request.code());
		}
		apply(request, projet);
		return ProjetResponse.from(projet);
	}

	/**
	 * @param id identifiant du projet à supprimer
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 * @throws ResourceInUseException    si le projet possède des tâches (le désactiver à la place)
	 */
	@Transactional
	public void delete(Long id) {
		Projet projet = getProjet(id);
		if (tacheRepository.existsByProjetId(id)) {
			throw new ResourceInUseException("Le projet possède des tâches : désactivez-le plutôt");
		}
		projetRepository.delete(projet);
	}

	private Projet getProjet(Long id) {
		return projetRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Projet", id));
	}

	private static void apply(ProjetRequest request, Projet projet) {
		projet.setCode(request.code());
		projet.setNom(request.nom());
		projet.setDescription(request.description());
		projet.setDateDebut(request.dateDebut());
		projet.setDateFin(request.dateFin());
		projet.setActif(request.actif() == null || request.actif());
	}

	private static DuplicateResourceException codeDejaUtilise(String code) {
		return new DuplicateResourceException("Un projet avec le code '" + code + "' existe déjà");
	}

}
