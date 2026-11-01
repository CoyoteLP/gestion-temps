package com.lirox.gestiontemps.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lirox.gestiontemps.domain.SaisieTemps;

/**
 * Accès aux données des saisies de temps.
 */
public interface SaisieTempsRepository extends JpaRepository<SaisieTemps, Long> {

	/**
	 * Recherche avec filtres optionnels (un paramètre null n'est pas filtré), triée par jour.
	 *
	 * @param utilisateurId saisies de cet utilisateur
	 * @param projetId      saisies sur les tâches de ce projet
	 * @param tacheId       saisies sur cette tâche
	 * @param du            saisies à partir de ce jour (inclus)
	 * @param au            saisies jusqu'à ce jour (inclus)
	 * @return les saisies correspondantes
	 */
	@Query("""
			select s from SaisieTemps s
			where (:utilisateurId is null or s.utilisateur.id = :utilisateurId)
			  and (:projetId is null or s.tache.projet.id = :projetId)
			  and (:tacheId is null or s.tache.id = :tacheId)
			  and (:du is null or s.jour >= :du)
			  and (:au is null or s.jour <= :au)
			order by s.jour, s.id
			""")
	List<SaisieTemps> search(@Param("utilisateurId") Long utilisateurId, @Param("projetId") Long projetId,
			@Param("tacheId") Long tacheId, @Param("du") LocalDate du, @Param("au") LocalDate au);

	/**
	 * Total des heures saisies par un utilisateur sur une journée.
	 *
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param jour          journée concernée
	 * @param exclueId      saisie à exclure du total (celle en cours de modification), ou null
	 * @return le total en heures, 0 si aucune saisie
	 */
	@Query("""
			select coalesce(sum(s.duree), 0) from SaisieTemps s
			where s.utilisateur.id = :utilisateurId
			  and s.jour = :jour
			  and (:exclueId is null or s.id <> :exclueId)
			""")
	BigDecimal totalJournee(@Param("utilisateurId") Long utilisateurId, @Param("jour") LocalDate jour,
			@Param("exclueId") Long exclueId);

	/**
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur possède au moins une saisie
	 */
	boolean existsByUtilisateurId(Long utilisateurId);

	/**
	 * @param tacheId identifiant de la tâche
	 * @return true si la tâche possède au moins une saisie
	 */
	boolean existsByTacheId(Long tacheId);

}
