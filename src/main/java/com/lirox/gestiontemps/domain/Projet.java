package com.lirox.gestiontemps.domain;

import java.time.LocalDate;

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
 * Projet sur lequel les utilisateurs imputent leur temps, via ses tâches.
 */
@Entity
@Table(name = "projet")
@Getter
@Setter
@NoArgsConstructor
public class Projet extends EntiteAuditee {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Version pour le verrouillage optimiste, incrémentée par Hibernate à chaque modification. */
	@Version
	@Column(nullable = false)
	private Long version;

	/** Code court et unique du projet (ex. "PRJ-01"). */
	@Column(nullable = false, unique = true, length = 20)
	private String code;

	@Column(nullable = false, length = 100)
	private String nom;

	@Column(length = 1000)
	private String description;

	/** Date de début prévue, optionnelle. */
	private LocalDate dateDebut;

	/** Date de fin prévue, optionnelle ; postérieure ou égale à la date de début. */
	private LocalDate dateFin;

	/** Un projet désactivé n'accepte plus de nouvelles saisies de temps sur ses tâches. */
	@Column(nullable = false)
	private boolean actif = true;

}
