package com.lirox.gestiontemps.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.lirox.gestiontemps.domain.MembreProjet;

/**
 * Accès aux données des membres de projet.
 */
public interface MembreProjetRepository extends JpaRepository<MembreProjet, Long> {

	/**
	 * @param projetId identifiant du projet
	 * @param page     page et tri demandés
	 * @return la page de membres du projet
	 */
	Page<MembreProjet> findByProjetId(Long projetId, Pageable page);

	/**
	 * @param id       identifiant du membre
	 * @param projetId projet auquel il doit appartenir
	 * @return le membre, s'il appartient bien à ce projet
	 */
	Optional<MembreProjet> findByIdAndProjetId(Long id, Long projetId);

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur est membre du projet, quel que soit son rôle
	 */
	boolean existsByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

	/**
	 * Contrôle d'unicité lors d'une modification.
	 *
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param id            membre modifié, exclu de la recherche
	 * @return true si l'utilisateur est déjà membre du projet sous un autre enregistrement
	 */
	boolean existsByProjetIdAndUtilisateurIdAndIdNot(Long projetId, Long utilisateurId, Long id);

	/**
	 * @param projetId identifiant du projet dont on retire tous les membres
	 */
	void deleteByProjetId(Long projetId);

	/**
	 * @param utilisateurId identifiant de l'utilisateur retiré de tous ses projets
	 */
	void deleteByUtilisateurId(Long utilisateurId);

}
