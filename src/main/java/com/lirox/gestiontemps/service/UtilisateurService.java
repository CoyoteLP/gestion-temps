package com.lirox.gestiontemps.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.UtilisateurRequest;
import com.lirox.gestiontemps.dto.UtilisateurResponse;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
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

	/**
	 * @return tous les utilisateurs
	 */
	public List<UtilisateurResponse> findAll() {
		return utilisateurRepository.findAll().stream().map(UtilisateurResponse::from).toList();
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
	 */
	@Transactional
	public UtilisateurResponse update(Long id, UtilisateurRequest request) {
		Utilisateur utilisateur = getUtilisateur(id);
		if (utilisateurRepository.existsByEmailAndIdNot(request.email(), id)) {
			throw emailDejaUtilise(request.email());
		}
		apply(request, utilisateur);
		return UtilisateurResponse.from(utilisateur);
	}

	/**
	 * @param id identifiant de l'utilisateur à supprimer
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 * @throws ResourceInUseException    si l'utilisateur possède des saisies (le désactiver à la place)
	 */
	@Transactional
	public void delete(Long id) {
		Utilisateur utilisateur = getUtilisateur(id);
		if (saisieTempsRepository.existsByUtilisateurId(id)) {
			throw new ResourceInUseException("L'utilisateur possède des saisies de temps : désactivez-le plutôt");
		}
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
