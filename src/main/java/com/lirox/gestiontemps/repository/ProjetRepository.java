package com.lirox.gestiontemps.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
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
import com.lirox.gestiontemps.dto.SyntheseProjetResponse;

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

	/**
	 * Recherche filtrée, paginée et triée selon {@code page} (un paramètre null n'est pas filtré). Les
	 * motifs texte viennent de {@code MotifRecherche.contient} : échappés avec {@code !}.
	 *
	 * @param code          motif du code
	 * @param nom           motif du nom
	 * @param actif         statut
	 * @param utilisateurId restreint aux projets dont cet utilisateur est membre (null : tous)
	 * @param page          page et tri demandés
	 * @return la page de projets correspondants
	 */
	@Query("""
			select p from Projet p
			where (:code is null or p.code like :code escape '!')
			  and (:nom is null or p.nom like :nom escape '!')
			  and (:actif is null or p.actif = :actif)
			  and (:utilisateurId is null or exists (
			      select m from MembreProjet m where m.projet = p and m.utilisateur.id = :utilisateurId))
			""")
	Page<Projet> search(@Param("code") String code, @Param("nom") String nom, @Param("actif") Boolean actif,
			@Param("utilisateurId") Long utilisateurId, Pageable page);

	/**
	 * Synthèse d'un mois, projet par projet, en une requête : total des heures saisies et clôture du
	 * mois. Projets retenus : les actifs, et les inactifs qui ont des saisies ou une clôture ce mois-là ;
	 * filtrés par code ou nom et par clôture (un paramètre null n'est pas filtré). Le motif vient de
	 * {@code MotifRecherche.contient} : échappé avec {@code !}.
	 *
	 * @param debut   premier jour du mois
	 * @param fin     dernier jour du mois
	 * @param motif   motif du code ou du nom du projet
	 * @param cloture true : mois clôturé seulement ; false : mois ouvert seulement
	 * @param page    page et tri demandés (alias {@code p} : le projet)
	 * @return la page de synthèses (total null sans saisie, ramené à 0 par le DTO)
	 */
	@Query(value = """
			select new com.lirox.gestiontemps.dto.SyntheseProjetResponse(p.id, p.code, p.nom, p.actif,
			    (select sum(s.duree) from SaisieTemps s where s.tache.projet = p and s.jour between :debut and :fin),
			    (select c.id from Cloture c where c.projet = p and c.mois = :debut))
			from Projet p
			where (p.actif = true
			       or exists (select s from SaisieTemps s where s.tache.projet = p and s.jour between :debut and :fin)
			       or exists (select c from Cloture c where c.projet = p and c.mois = :debut))
			  and (:motif is null or p.code like :motif escape '!' or p.nom like :motif escape '!')
			  and (:cloture is null
			       or (:cloture = true and exists (select c from Cloture c where c.projet = p and c.mois = :debut))
			       or (:cloture = false and not exists (select c from Cloture c where c.projet = p and c.mois = :debut)))
			""", countQuery = """
			select count(p) from Projet p
			where (p.actif = true
			       or exists (select s from SaisieTemps s where s.tache.projet = p and s.jour between :debut and :fin)
			       or exists (select c from Cloture c where c.projet = p and c.mois = :debut))
			  and (:motif is null or p.code like :motif escape '!' or p.nom like :motif escape '!')
			  and (:cloture is null
			       or (:cloture = true and exists (select c from Cloture c where c.projet = p and c.mois = :debut))
			       or (:cloture = false and not exists (select c from Cloture c where c.projet = p and c.mois = :debut)))
			""")
	Page<SyntheseProjetResponse> syntheseDuMois(@Param("debut") LocalDate debut, @Param("fin") LocalDate fin,
			@Param("motif") String motif, @Param("cloture") Boolean cloture, Pageable page);

	/**
	 * Total des heures saisies dans le mois sur les projets de la synthèse filtrée (mêmes filtres que
	 * {@link #syntheseDuMois}) : un projet qui a des saisies dans le mois y figure toujours.
	 *
	 * @param debut   premier jour du mois
	 * @param fin     dernier jour du mois
	 * @param motif   motif du code ou du nom du projet
	 * @param cloture true : mois clôturé seulement ; false : mois ouvert seulement
	 * @return le total, ou null sans saisie
	 */
	@Query("""
			select sum(s.duree) from SaisieTemps s join s.tache t join t.projet p
			where s.jour between :debut and :fin
			  and (:motif is null or p.code like :motif escape '!' or p.nom like :motif escape '!')
			  and (:cloture is null
			       or (:cloture = true and exists (select c from Cloture c where c.projet = p and c.mois = :debut))
			       or (:cloture = false and not exists (select c from Cloture c where c.projet = p and c.mois = :debut)))
			""")
	BigDecimal totalDuMois(@Param("debut") LocalDate debut, @Param("fin") LocalDate fin,
			@Param("motif") String motif, @Param("cloture") Boolean cloture);

}
