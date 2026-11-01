package com.lirox.gestiontemps.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tâche d'un projet, sur laquelle les utilisateurs imputent leur temps.
 */
@Entity
@Table(name = "tache")
@Getter
@Setter
@NoArgsConstructor
public class Tache {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Projet auquel appartient la tâche. */
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "projet_id", nullable = false)
	private Projet projet;

	@Column(nullable = false, length = 100)
	private String libelle;

	@Column(length = 1000)
	private String description;

	/** Une tâche désactivée n'accepte plus de nouvelles saisies de temps. */
	@Column(nullable = false)
	private boolean actif = true;

}
