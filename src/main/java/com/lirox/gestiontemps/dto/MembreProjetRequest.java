package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.constraints.NotNull;

/**
 * Données d'ajout ou de modification d'un membre de projet.
 *
 * @param utilisateurId utilisateur membre du projet
 * @param role          rôle dans le projet
 * @param version       version lue avant modification, obligatoire en modification et ignorée
 *                      en création ; un écart avec la version en base renvoie 409
 */
public record MembreProjetRequest(
		@NotNull Long utilisateurId,
		@NotNull RoleProjet role,
		@NotNull(groups = Modification.class, message = "est obligatoire en modification") Long version) {
}
