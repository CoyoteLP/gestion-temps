package com.lirox.gestiontemps.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Données de création ou de modification d'un projet.
 *
 * @param code        code court et unique du projet
 * @param nom         nom du projet
 * @param description description libre, optionnelle
 * @param dateDebut   date de début prévue, optionnelle
 * @param dateFin     date de fin prévue, optionnelle
 * @param actif       état du projet ; null = actif
 */
public record ProjetRequest(
		@NotBlank @Size(max = 20) String code,
		@NotBlank @Size(max = 100) String nom,
		@Size(max = 1000) String description,
		LocalDate dateDebut,
		LocalDate dateFin,
		Boolean actif) {

	/**
	 * Règle de validation inter-champs (exposée sous le nom {@code periodeValide}).
	 *
	 * @return true si la date de fin n'est pas antérieure à la date de début, ou si l'une est absente
	 */
	@AssertTrue(message = "la date de fin doit être postérieure ou égale à la date de début")
	public boolean isPeriodeValide() {
		return dateDebut == null || dateFin == null || !dateFin.isBefore(dateDebut);
	}

}
