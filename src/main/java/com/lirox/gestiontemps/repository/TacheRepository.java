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
	 * @return true si le projet possède au moins une tâche
	 */
	boolean existsByProjetId(Long projetId);

	/**
	 * Recherche filtrée, paginée et triée selon {@code page} (un paramètre null n'est pas filtré). Les
	 * motifs texte viennent de {@code MotifRecherche.contient} : échappés avec {@code !}.
	 *
	 * @param projetId      tâches de ce projet
	 * @param libelle       motif du libellé
	 * @param actif         statut
	 * @param utilisateurId restreint aux projets dont cet utilisateur est membre (null : tous)
	 * @param page          page et tri demandés
	 * @return la page de tâches correspondantes
	 */
	@Query("""
			select t from Tache t
			where (:projetId is null or t.projet.id = :projetId)
			  and (:libelle is null or t.libelle like :libelle escape '!')
			  and (:actif is null or t.actif = :actif)
			  and (:utilisateurId is null or exists (
			      select m from MembreProjet m where m.projet = t.projet and m.utilisateur.id = :utilisateurId))
			""")
	Page<Tache> search(@Param("projetId") Long projetId, @Param("libelle") String libelle,
			@Param("actif") Boolean actif, @Param("utilisateurId") Long utilisateurId, Pageable page);

}
