package com.lirox.gestiontemps.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;

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
	 * Projets visibles par un collaborateur : ceux dont il est membre, quel que soit son rôle.
	 *
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param page          page et tri demandés
	 * @return la page des projets dont l'utilisateur est membre
	 */
	@Query("""
			select p from Projet p
			where exists (select m from MembreProjet m where m.projet = p and m.utilisateur.id = :utilisateurId)
			""")
	Page<Projet> findDontMembre(@Param("utilisateurId") Long utilisateurId, Pageable page);

	/**
	 * Contrôle d'unicité du code lors d'une modification.
	 *
	 * @param code code de projet
	 * @param id   projet modifié, exclu de la recherche
	 * @return true si un autre projet porte déjà ce code
	 */
	boolean existsByCodeAndIdNot(String code, Long id);

	/**
	 * Verrou partagé sur le projet ({@code lock in share mode}) jusqu'à la fin de la transaction :
	 * posé par chaque écriture de saisie, il n'empêche pas les autres saisies mais fait attendre une
	 * clôture du projet, qui ne peut donc pas s'intercaler entre son contrôle et son enregistrement.
	 *
	 * @param id identifiant du projet
	 * @return le projet, verrouillé en lecture
	 */
	@Lock(LockModeType.PESSIMISTIC_READ)
	@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = Constantes.DELAI_VERROU_PROJET_MS))
	@Query("select p from Projet p where p.id = :id")
	Optional<Projet> findPartageById(@Param("id") Long id);

	/**
	 * Verrou exclusif sur le projet ({@code for update}) jusqu'à la fin de la transaction : posé par
	 * une clôture, il attend la fin des écritures de saisies en cours sur le projet.
	 *
	 * @param id identifiant du projet
	 * @return le projet, verrouillé en écriture
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = Constantes.DELAI_VERROU_PROJET_MS))
	@Query("select p from Projet p where p.id = :id")
	Optional<Projet> findVerrouilleById(@Param("id") Long id);

	/**
	 * Projets actifs verrouillés en écriture, dans l'ordre des identifiants (ordre constant : pas
	 * d'interblocage entre deux clôtures globales).
	 *
	 * @return les projets actifs
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = Constantes.DELAI_VERROU_PROJET_MS))
	@Query("select p from Projet p where p.actif = true order by p.id")
	List<Projet> findActifsVerrouilles();

}
