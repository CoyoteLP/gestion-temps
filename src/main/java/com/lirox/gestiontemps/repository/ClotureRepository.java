package com.lirox.gestiontemps.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lirox.gestiontemps.domain.Cloture;

/**
 * Accès aux données des clôtures mensuelles.
 */
public interface ClotureRepository extends JpaRepository<Cloture, Long> {

	/**
	 * @param projetId identifiant du projet
	 * @param mois     premier jour du mois
	 * @return true si le mois est clôturé pour ce projet
	 */
	boolean existsByProjetIdAndMois(Long projetId, LocalDate mois);

	/**
	 * @param projetId identifiant du projet
	 * @return true si le projet a au moins une clôture
	 */
	boolean existsByProjetId(Long projetId);

	/**
	 * @param mois premier jour du mois
	 * @return les identifiants des projets déjà clôturés pour ce mois
	 */
	@Query("select c.projet.id from Cloture c where c.mois = :mois")
	Set<Long> findProjetIdsByMois(@Param("mois") LocalDate mois);

	/**
	 * @param projetId identifiant du projet dont on supprime les clôtures
	 */
	void deleteByProjetId(Long projetId);

	/**
	 * Recherche avec filtres optionnels (un paramètre null n'est pas filtré), du mois le plus récent
	 * au plus ancien.
	 *
	 * @param projetId clôtures de ce projet
	 * @param mois     clôtures de ce mois (premier jour)
	 * @return les clôtures correspondantes
	 */
	@Query("""
			select c from Cloture c
			where (:projetId is null or c.projet.id = :projetId)
			  and (:mois is null or c.mois = :mois)
			order by c.mois desc, c.projet.id
			""")
	List<Cloture> search(@Param("projetId") Long projetId, @Param("mois") LocalDate mois);

}
