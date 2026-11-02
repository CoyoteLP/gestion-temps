package com.lirox.gestiontemps.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Appartenance d'un utilisateur à un projet, avec son rôle : donne accès aux saisies du projet.
 * Un utilisateur est membre d'un projet au plus une fois.
 */
@Entity
@Table(name = "membre_projet", uniqueConstraints = @UniqueConstraint(name = "uk_membre_projet_projet_utilisateur",
		columnNames = { "projet_id", "utilisateur_id" }))
@Getter
@Setter
@NoArgsConstructor
public class MembreProjet extends EntiteAuditee {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Version pour le verrouillage optimiste, incrémentée par Hibernate à chaque modification. */
	@Version
	@Column(nullable = false)
	private Long version;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "projet_id", nullable = false)
	private Projet projet;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "utilisateur_id", nullable = false)
	private Utilisateur utilisateur;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private RoleProjet role;

}
