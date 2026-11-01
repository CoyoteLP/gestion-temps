package com.lirox.gestiontemps.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lirox.gestiontemps.domain.Tache;

/**
 * Accès aux données des tâches.
 */
public interface TacheRepository extends JpaRepository<Tache, Long> {

	/**
	 * @param projetId identifiant du projet
	 * @return les tâches du projet
	 */
	List<Tache> findByProjetId(Long projetId);

	/**
	 * @param projetId identifiant du projet
	 * @return true si le projet possède au moins une tâche
	 */
	boolean existsByProjetId(Long projetId);

}
