package com.lirox.gestiontemps.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.validation.Modification;
import com.lirox.gestiontemps.validation.PasDe;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Données de création ou de modification d'une saisie de temps.
 *
 * @param utilisateurId utilisateur ayant effectué le travail
 * @param tacheId       tâche sur laquelle le temps est imputé
 * @param jour          journée travaillée, optionnelle : date du jour en création, date inchangée en
 *                      modification
 * @param duree         durée en heures, de {@value Constantes#DUREE_MIN_SAISIE} à
 *                      {@value Constantes#DUREE_MAX_SAISIE} par pas de {@value Constantes#PAS_DUREE_SAISIE}
 *                      (ex. 1.5 = 1h30)
 * @param commentaire   commentaire libre, optionnel
 * @param version       version lue avant modification, obligatoire en modification et ignorée
 *                      en création ; un écart avec la version en base renvoie 409
 */
public record SaisieTempsRequest(
		@NotNull Long utilisateurId,
		@NotNull Long tacheId,
		LocalDate jour,
		@NotNull(message = "est obligatoire")
		@DecimalMin(value = Constantes.DUREE_MIN_SAISIE, message = "doit être d'au moins {value} h")
		@DecimalMax(value = Constantes.DUREE_MAX_SAISIE, message = "ne doit pas dépasser {value} h")
		@PasDe(value = Constantes.PAS_DUREE_SAISIE, message = "doit être un multiple de {value} h")
		BigDecimal duree,
		@Size(max = 500) String commentaire,
		@NotNull(groups = Modification.class, message = "est obligatoire en modification") Long version) {
}
