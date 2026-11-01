package com.lirox.gestiontemps.domain;

import org.hibernate.annotations.OptimisticLock;

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
public class Utilisateur {

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
	 * Identifiant du compte chez le fournisseur OIDC (revendication {@code sub} du jeton), renseigné
	 * à la première connexion par rapprochement de l'email ; null tant que l'utilisateur ne s'est
	 * jamais connecté. Exclu du verrouillage optimiste : le rattachement n'est pas une modification
	 * de la fiche et ne doit pas périmer la version qu'un administrateur vient de lire.
	 */
	@Column(unique = true, length = 255)
	@OptimisticLock(excluded = true)
	private String sujet;

	/** Un utilisateur désactivé ne peut plus saisir de nouveau temps. */
	@Column(nullable = false)
	private boolean actif = true;

}
