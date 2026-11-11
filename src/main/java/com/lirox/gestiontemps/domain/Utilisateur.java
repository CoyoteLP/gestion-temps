package com.lirox.gestiontemps.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Personne qui saisit son temps de travail.
 */
@Entity
@Table(name = "utilisateur")
@Getter
@Setter
@NoArgsConstructor
public class Utilisateur extends EntiteAuditee {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Version pour le verrouillage optimiste, incrémentée par Hibernate à chaque modification. */
	@Version
	@Column(nullable = false)
	private Long version;

	/** Adresse email, unique : identifie l'utilisateur. */
	@Column(nullable = false, unique = true, length = 150)
	private String email;

	@Column(nullable = false, length = 100)
	private String nom;

	@Column(nullable = false, length = 100)
	private String prenom;

	/**
	 * Identifiant du compte chez le fournisseur OIDC (revendication {@code sub} du jeton). Fiche créée
	 * par un administrateur : renseigné à la première connexion par rapprochement de l'email, par
	 * {@code UtilisateurRepository.rattacherSujet} (sans changer la version ni l'audit) ; null tant
	 * que l'utilisateur ne s'est jamais connecté. Fiche créée par l'utilisateur lui-même
	 * (inscription) : renseigné dès la création.
	 */
	@Column(unique = true, length = 255)
	private String sujet;

	/**
	 * Un utilisateur inactif (inscrit en attente de validation, ou désactivé) n'accède qu'à sa propre
	 * fiche, et ne peut plus saisir de nouveau temps.
	 */
	@Column(nullable = false)
	private boolean actif = true;

}
