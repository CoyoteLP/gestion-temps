package com.lirox.gestiontemps.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.RoleProjet;
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
