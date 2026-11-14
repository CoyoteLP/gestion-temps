package com.lirox.gestiontemps.service;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.repository.MembreProjetRepository;

import lombok.RequiredArgsConstructor;

/**
 * Droits d'accès aux projets selon l'appartenance ({@code MembreProjet}) : un administrateur accède à
 * tous les projets ; un collaborateur seulement à ceux dont il est membre, quel que soit son rôle.
 * Les responsables ({@link RoleProjet#RESPONSABLES}) ont en plus accès aux saisies des autres membres
 * et à la clôture.
 * <p>
 * Service à part, sans dépendance vers les autres services métier : il est utilisé par ceux des
 * projets, des tâches, des membres, des clôtures et des saisies sans créer de cycle.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccesProjetService {

	/** Refus d'accès à un projet dont l'appelant n'est pas membre. */
	static final String MESSAGE_NON_MEMBRE = "Vous n'êtes pas membre de ce projet";

	private final MembreProjetRepository membreProjetRepository;
	private final UtilisateurCourantService utilisateurCourantService;

	/**
	 * Restriction à appliquer aux listes : aucune pour un administrateur, les projets de l'appelant
	 * sinon.
	 *
	 * @return null pour un administrateur, sinon l'identifiant de l'utilisateur de l'appelant
	 * @throws AccesRefuseException si l'appelant n'a pas de fiche active
	 */
	Long utilisateurRestreint() {
		return utilisateurCourantService.estAdmin() ? null : utilisateurCourantService.get().getId();
	}

	/**
	 * @param projetId identifiant du projet (existant : à vérifier avant, pour répondre 404 sinon)
	 * @throws AccesRefuseException si l'appelant n'est ni administrateur ni membre du projet
	 */
	void verifierAcces(Long projetId) {
		Long utilisateurId = utilisateurRestreint();
		if (utilisateurId != null && !estMembre(projetId, utilisateurId)) {
			throw new AccesRefuseException(MESSAGE_NON_MEMBRE);
		}
	}

	/**
	 * @return true si l'appelant est administrateur
	 */
	boolean estAdmin() {
		return utilisateurCourantService.estAdmin();
	}

	/**
	 * Fiche de l'appelant, pour connaître son rôle dans les projets : obligatoire et active pour un
	 * collaborateur, facultative pour un administrateur.
	 *
	 * @return l'identifiant de sa fiche, ou null pour un administrateur qui n'en a pas
	 * @throws AccesRefuseException si un collaborateur n'a pas de fiche active
	 */
	Long idFicheCourante() {
		return utilisateurCourantService.estAdmin()
				? utilisateurCourantService.trouver().map(Utilisateur::getId).orElse(null)
				: utilisateurCourantService.get().getId();
	}

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return son rôle dans le projet, ou vide s'il n'en est pas membre
	 */
	Optional<RoleProjet> roleDans(Long projetId, Long utilisateurId) {
		return membreProjetRepository.findByProjetIdAndUtilisateurId(projetId, utilisateurId)
				.map(MembreProjet::getRole);
	}

	/**
	 * Rôle de l'appelant dans un projet, en vérifiant son accès au passage : une seule requête sert
	 * aux deux (un collaborateur sans rôle n'est pas membre).
	 *
	 * @param projetId identifiant du projet (existant : à vérifier avant, pour répondre 404 sinon)
	 * @return son rôle, ou null pour un administrateur qui n'est pas membre du projet (ou sans fiche)
	 * @throws AccesRefuseException si l'appelant n'est ni administrateur ni membre du projet
	 */
	RoleProjet roleVerifie(Long projetId) {
		Long moi = idFicheCourante();
		RoleProjet role = moi == null ? null : roleDans(projetId, moi).orElse(null);
		if (role == null && !utilisateurCourantService.estAdmin()) {
			throw new AccesRefuseException(MESSAGE_NON_MEMBRE);
		}
		return role;
	}

	/**
	 * Rôles d'un utilisateur dans une page de projets, en une seule requête.
	 *
	 * @param projetIds     projets de la page
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return son rôle par identifiant de projet, pour ceux dont il est membre
	 */
	Map<Long, RoleProjet> rolesDans(Collection<Long> projetIds, Long utilisateurId) {
		if (projetIds.isEmpty()) {
			return Map.of();
		}
		return membreProjetRepository.findByUtilisateurIdAndProjetIdIn(utilisateurId, projetIds).stream()
				.collect(Collectors.toMap(membre -> membre.getProjet().getId(), MembreProjet::getRole));
	}

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur est membre du projet, quel que soit son rôle
	 */
	boolean estMembre(Long projetId, Long utilisateurId) {
		return membreProjetRepository.existsByProjetIdAndUtilisateurId(projetId, utilisateurId);
	}

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur est responsable ou suppléant du projet
	 */
	boolean estResponsable(Long projetId, Long utilisateurId) {
		return membreProjetRepository.existsByProjetIdAndUtilisateurIdAndRoleIn(projetId, utilisateurId,
				RoleProjet.RESPONSABLES);
	}

}
