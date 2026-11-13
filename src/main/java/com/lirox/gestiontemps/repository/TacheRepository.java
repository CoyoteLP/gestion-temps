package com.lirox.gestiontemps.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

	/**
	 * Tâches visibles par un collaborateur : celles des projets dont il est membre.
	 *
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param page          page et tri demandés
	 * @return la page des tâches des projets dont l'utilisateur est membre
	 */
	@Query("""
			select t from Tache t
			where exists (select m from MembreProjet m where m.projet = t.projet and m.utilisateur.id = :utilisateurId)
			""")
	Page<Tache> findDontMembre(@Param("utilisateurId") Long utilisateurId, Pageable page);

}
