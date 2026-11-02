package com.lirox.gestiontemps.dto;

import java.time.LocalDate;

import com.lirox.gestiontemps.common.Constantes;

import jakarta.validation.constraints.AssertTrue;

/**
 * Filtres de recherche des saisies, lus dans les paramètres de la requête. Sans période ({@code du}
 * et {@code au} absents), le service retient le mois en cours.
 *
 * @param utilisateurId saisies de cet utilisateur, optionnel
 * @param projetId      saisies sur les tâches de ce projet, optionnel
 * @param tacheId       saisies sur cette tâche, optionnel
 * @param du            premier jour de la période (inclus), à fournir avec {@code au}
 * @param au            dernier jour de la période (inclus), à fournir avec {@code du}
 */
public record RechercheSaisiesRequest(
		Long utilisateurId,
		Long projetId,
		Long tacheId,
		LocalDate du,
		LocalDate au) {

	/**
	 * Règle de validation (exposée sous le nom {@code periodeComplete}).
	 *
	 * @return true si les deux bornes sont fournies, ou aucune
	 */
	@AssertTrue(message = "du et au doivent être fournis ensemble (sans eux : mois en cours)")
	public boolean isPeriodeComplete() {
		return (du == null) == (au == null);
	}

	/**
	 * Règle de validation (exposée sous le nom {@code periodeOrdonnee}).
	 *
	 * @return true si {@code au} n'est pas antérieur à {@code du}, ou si une borne manque
	 */
	@AssertTrue(message = "au doit être postérieur ou égal à du")
	public boolean isPeriodeOrdonnee() {
		return du == null || au == null || !au.isBefore(du);
	}

	/**
	 * Règle de validation (exposée sous le nom {@code periodeLimitee}).
	 *
	 * @return true si la période couvre au plus {@value Constantes#DUREE_MAX_RECHERCHE_ANNEES} an
	 *         (ex. du 2026-01-01 au 2026-12-31), ou si une borne manque
	 */
	@AssertTrue(message = "la période ne doit pas dépasser " + Constantes.DUREE_MAX_RECHERCHE_ANNEES + " an")
	public boolean isPeriodeLimitee() {
		return du == null || au == null || au.isBefore(du.plusYears(Constantes.DUREE_MAX_RECHERCHE_ANNEES));
	}

}
