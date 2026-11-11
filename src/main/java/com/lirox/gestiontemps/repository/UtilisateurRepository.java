package com.lirox.gestiontemps.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Utilisateur;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;

/**
 * Accès aux données des utilisateurs.
 */
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

	/**
	 * @param actif    état recherché (false : comptes en attente de validation ou désactivés)
	 * @param pageable page et tri demandés
	 * @return une page des utilisateurs dans cet état
	 */
	Page<Utilisateur> findByActif(boolean actif, Pageable pageable);

	/**
	 * @param email adresse email
	 * @return true si un utilisateur possède déjà cet email
	 */
	boolean existsByEmail(String email);

	/**
	 * Contrôle d'unicité de l'email lors d'une modification.
	 *
	 * @param email adresse email
	 * @param id    utilisateur modifié, exclu de la recherche
	 * @return true si un autre utilisateur possède déjà cet email
	 */
	boolean existsByEmailAndIdNot(String email, Long id);

	/**
	 * @param sujet identifiant du compte chez le fournisseur OIDC (revendication {@code sub})
	 * @return l'utilisateur rattaché à ce compte
	 */
	Optional<Utilisateur> findBySujet(String sujet);

	/**
	 * @param email adresse email
	 * @return l'utilisateur ayant cet email
	 */
	Optional<Utilisateur> findByEmail(String email);

	/**
	 * Rattache un compte du fournisseur OIDC à un utilisateur qui n'en a pas encore. Requête de mise
	 * à jour directe : le rattachement n'est pas une modification de la fiche (ni version ni audit
	 * changés), et la condition {@code sujet is null} empêche deux rattachements concurrents.
	 *
	 * @param id    identifiant de l'utilisateur
	 * @param sujet identifiant du compte chez le fournisseur (revendication {@code sub})
	 * @return 1 si le compte a été rattaché, 0 si l'utilisateur avait déjà un compte
	 */
	@Modifying
	@Query("update Utilisateur u set u.sujet = :sujet where u.id = :id and u.sujet is null")
	int rattacherSujet(@Param("id") Long id, @Param("sujet") String sujet);

	/**
	 * Charge l'utilisateur en posant un verrou en écriture sur sa ligne ({@code select … for update})
	 * jusqu'à la fin de la transaction : les transactions qui demandent le même verrou attendent.
	 * Sert à sérialiser les écritures de saisies d'un même utilisateur (total journalier). L'attente
	 * est limitée à {@link Constantes#DELAI_VERROU_UTILISATEUR_MS} ms, au-delà une
	 * {@code PessimisticLockingFailureException} est levée.
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'utilisateur verrouillé, ou vide s'il n'existe pas
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = Constantes.DELAI_VERROU_UTILISATEUR_MS))
	@Query("select u from Utilisateur u where u.id = :id")
	Optional<Utilisateur> findVerrouilleById(@Param("id") Long id);

}
