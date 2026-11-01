package com.lirox.gestiontemps.domain;

import java.math.BigDecimal;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Temps passé par un utilisateur sur une tâche pour une journée donnée.
 */
@Entity
@Table(name = "saisie_temps")
@Getter
@Setter
@NoArgsConstructor
public class SaisieTemps {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "utilisateur_id", nullable = false)
	private Utilisateur utilisateur;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "tache_id", nullable = false)
	private Tache tache;

	/** Journée travaillée. */
	@Column(nullable = false)
	private LocalDate jour;

	/** Durée en heures (ex. 1.50 = 1h30). */
	@Column(nullable = false, precision = 4, scale = 2)
	private BigDecimal duree;

	@Column(length = 500)
	private String commentaire;

}
