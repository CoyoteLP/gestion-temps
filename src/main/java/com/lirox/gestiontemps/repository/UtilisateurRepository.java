package com.lirox.gestiontemps.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lirox.gestiontemps.domain.Utilisateur;

/**
 * Accès aux données des utilisateurs.
 */
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

	/**
	 * @param email adresse email
	 * @return true si un utilisateur possède déjà cet email
	 */
	boolean existsByEmail(String email);

	/**
	 * Contrôle d'unicité de l'email lors d'une modification.
	 *
	 * @param email adresse email
	 * @param id    utilisateur modifié, exclu de la recherche
	 * @return true si un autre utilisateur possède déjà cet email
	 */
	boolean existsByEmailAndIdNot(String email, Long id);

}
