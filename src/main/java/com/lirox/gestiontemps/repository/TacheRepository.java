package com.lirox.gestiontemps.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.lirox.gestiontemps.domain.Tache;

/**
 * Accès aux données des tâches.
 */
public interface TacheRepository extends JpaRepository<Tache, Long> {

	/**
	 * @param projetId identifiant du projet
	 * @param page     page et tri demandés
	 * @return la page de tâches du projet
	 */
	Page<Tache> findByProjetId(Long projetId, Pageable page);

	/**
	 * @param projetId identifiant du projet
	 * @return true si le projet possède au moins une tâche
	 */
	boolean existsByProjetId(Long projetId);

}
