package com.lirox.gestiontemps.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lirox.gestiontemps.domain.Projet;

/**
 * Accès aux données des projets.
 */
public interface ProjetRepository extends JpaRepository<Projet, Long> {

	/**
	 * @param code code de projet
	 * @return true si un projet porte déjà ce code
	 */
	boolean existsByCode(String code);

	/**
	 * Contrôle d'unicité du code lors d'une modification.
	 *
	 * @param code code de projet
	 * @param id   projet modifié, exclu de la recherche
	 * @return true si un autre projet porte déjà ce code
	 */
	boolean existsByCodeAndIdNot(String code, Long id);

}
