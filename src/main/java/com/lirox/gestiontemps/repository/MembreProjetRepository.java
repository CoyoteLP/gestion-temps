package com.lirox.gestiontemps.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.RoleProjet;

/**
 * Accès aux données des membres de projet.
 */
public interface MembreProjetRepository extends JpaRepository<MembreProjet, Long> {

	/**
	 * @param id       identifiant du membre
	 * @param projetId projet auquel il doit appartenir
	 * @return le membre, s'il appartient bien à ce projet, avec son utilisateur chargé
	 */
	@EntityGraph(attributePaths = "utilisateur")
	Optional<MembreProjet> findByIdAndProjetId(Long id, Long projetId);

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return true si l'utilisateur est membre du projet, quel que soit son rôle
	 */
	boolean existsByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param roles         rôles recherchés
	 * @return true si l'utilisateur est membre du projet avec l'un de ces rôles
	 */
	boolean existsByProjetIdAndUtilisateurIdAndRoleIn(Long projetId, Long utilisateurId, Collection<RoleProjet> roles);

	/**
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @return l'appartenance de l'utilisateur au projet, si elle existe
	 */
	Optional<MembreProjet> findByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

	/**
	 * Appartenances d'un utilisateur à une page de projets, en une seule requête.
	 *
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param projetIds     projets recherchés
	 * @return les appartenances de l'utilisateur à ceux de ces projets dont il est membre
	 */
	List<MembreProjet> findByUtilisateurIdAndProjetIdIn(Long utilisateurId, Collection<Long> projetIds);

	/**
	 * Contrôle d'unicité lors d'une modification.
	 *
	 * @param projetId      identifiant du projet
	 * @param utilisateurId identifiant de l'utilisateur
	 * @param id            membre modifié, exclu de la recherche
	 * @return true si l'utilisateur est déjà membre du projet sous un autre enregistrement
	 */
	boolean existsByProjetIdAndUtilisateurIdAndIdNot(Long projetId, Long utilisateurId, Long id);

	/**
	 * @param projetId identifiant du projet dont on retire tous les membres
	 */
	void deleteByProjetId(Long projetId);

	/**
	 * @param utilisateurId identifiant de l'utilisateur retiré de tous ses projets
	 */
	void deleteByUtilisateurId(Long utilisateurId);

	/**
	 * Recherche filtrée, paginée et triée selon {@code page} (un paramètre null n'est pas filtré). Les
	 * motifs texte viennent de {@code MotifRecherche.contient} : échappés avec {@code !}. L'alias {@code m} est repris par le tri par rôle ({@code TriMembre.ROLE}).
	 *
	 * @param projetId identifiant du projet
	 * @param nom      motif du nom ou du prénom de l'utilisateur
	 * @param email    motif de l'email de l'utilisateur
	 * @param role     rôle dans le projet
	 * @param page     page et tri demandés
	 * @return la page de membres correspondants, avec leur utilisateur chargé dans la même requête
	 *         (son nom est renvoyé avec chaque membre)
	 */
	@Query("""
			select m from MembreProjet m
			where m.projet.id = :projetId
			  and (:nom is null or m.utilisateur.nom like :nom escape '!' or m.utilisateur.prenom like :nom escape '!')
			  and (:email is null or m.utilisateur.email like :email escape '!')
			  and (:role is null or m.role = :role)
			""")
	@EntityGraph(attributePaths = "utilisateur")
	Page<MembreProjet> search(@Param("projetId") Long projetId, @Param("nom") String nom,
			@Param("email") String email, @Param("role") RoleProjet role, Pageable page);

}
