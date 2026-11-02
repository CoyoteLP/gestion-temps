package com.lirox.gestiontemps.service;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.PageResponse;
import com.lirox.gestiontemps.dto.PaginationRequest;
import com.lirox.gestiontemps.dto.UtilisateurRequest;
import com.lirox.gestiontemps.dto.UtilisateurResponse;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des utilisateurs : unicité de l'email et interdiction de supprimer un utilisateur qui a
 * des saisies de temps.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurService {

	private final UtilisateurRepository utilisateurRepository;
	private final SaisieTempsRepository saisieTempsRepository;
	private final MembreProjetRepository membreProjetRepository;

	/**
	 * @param pagination page demandée
	 * @return une page d'utilisateurs, par identifiant croissant
	 */
	public PageResponse<UtilisateurResponse> findAll(PaginationRequest pagination) {
		return PageResponse.from(utilisateurRepository.findAll(pagination.versPageRequest(Sort.by("id"))),
				UtilisateurResponse::from);
	}

	/**
	 * @param id identifiant de l'utilisateur
	 * @return l'utilisateur
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	public UtilisateurResponse findById(Long id) {
		return UtilisateurResponse.from(getUtilisateur(id));
	}

	/**
	 * @param request données de l'utilisateur
	 * @return l'utilisateur créé
	 * @throws DuplicateResourceException si l'email est déjà utilisé
	 */
	@Transactional
	public UtilisateurResponse create(UtilisateurRequest request) {
		if (utilisateurRepository.existsByEmail(request.email())) {
			throw emailDejaUtilise(request.email());
		}
		Utilisateur utilisateur = new Utilisateur();
		apply(request, utilisateur);
		return UtilisateurResponse.from(utilisateurRepository.save(utilisateur));
	}

	/**
	 * @param id      identifiant de l'utilisateur
	 * @param request nouvelles données
	 * @return l'utilisateur modifié
	 * @throws ResourceNotFoundException  si l'utilisateur n'existe pas
	 * @throws DuplicateResourceException si l'email est déjà utilisé par un autre utilisateur
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public UtilisateurResponse update(Long id, UtilisateurRequest request) {
		Utilisateur utilisateur = getUtilisateur(id);
		VerrouOptimiste.verifier(utilisateur.getVersion(), request.version());
		if (utilisateurRepository.existsByEmailAndIdNot(request.email(), id)) {
			throw emailDejaUtilise(request.email());
		}
		apply(request, utilisateur);
		utilisateurRepository.flush();
		return UtilisateurResponse.from(utilisateur);
	}

	/**
	 * @param id identifiant de l'utilisateur à supprimer
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 * @throws ResourceInUseException    si l'utilisateur possède des saisies (le désactiver à la place) ;
	 *                                   il est retiré des projets dont il est membre
	 */
	@Transactional
	public void delete(Long id) {
		Utilisateur utilisateur = getUtilisateur(id);
		if (saisieTempsRepository.existsByUtilisateurId(id)) {
			throw new ResourceInUseException("L'utilisateur possède des saisies de temps : désactivez-le plutôt");
		}
		membreProjetRepository.deleteByUtilisateurId(id);
		utilisateurRepository.delete(utilisateur);
	}

	/**
	 * Charge l'entité ; réservé aux autres services du paquet (ex. {@link SaisieTempsService}).
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'entité utilisateur
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	Utilisateur getUtilisateur(Long id) {
		return utilisateurRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
	}

	/**
	 * Charge l'entité en la verrouillant jusqu'à la fin de la transaction en cours, pour sérialiser
	 * les écritures qui dépendent de l'ensemble de ses données (ex. total journalier des saisies).
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'entité utilisateur, verrouillée
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	Utilisateur getUtilisateurVerrouille(Long id) {
		return utilisateurRepository.findVerrouilleById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
	}

	private static void apply(UtilisateurRequest request, Utilisateur utilisateur) {
		utilisateur.setEmail(request.email());
		utilisateur.setNom(request.nom());
		utilisateur.setPrenom(request.prenom());
		utilisateur.setActif(request.actif() == null || request.actif());
	}

	private static DuplicateResourceException emailDejaUtilise(String email) {
		return new DuplicateResourceException("Un utilisateur avec l'email '" + email + "' existe déjà");
	}

}
