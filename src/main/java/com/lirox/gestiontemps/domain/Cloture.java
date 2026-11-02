package com.lirox.gestiontemps.domain;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Clôture d'un mois pour un projet : ses saisies de ce mois ne peuvent plus être créées, modifiées
 * ni supprimées. La date et l'auteur de la clôture sont ceux de l'audit (création).
 */
@Entity
@Table(name = "cloture", uniqueConstraints = @UniqueConstraint(name = "uk_cloture_projet_mois",
		columnNames = { "projet_id", "mois" }))
@Getter
@Setter
@NoArgsConstructor
public class Cloture extends EntiteAuditee {

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

	/** Mois clôturé, représenté par son premier jour. */
	@Column(nullable = false)
	private LocalDate mois;

}
