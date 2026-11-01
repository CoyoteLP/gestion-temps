package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Données de création ou de modification d'une tâche.
 *
 * @param projetId    projet auquel rattacher la tâche
 * @param libelle     libellé de la tâche
 * @param description description libre, optionnelle
 * @param actif       état de la tâche ; null = active
 * @param version     version lue avant modification, obligatoire en modification et ignorée
 *                    en création ; un écart avec la version en base renvoie 409
 */
public record TacheRequest(
		@NotNull Long projetId,
		@NotBlank @Size(max = 100) String libelle,
		@Size(max = 1000) String description,
		Boolean actif,
		@NotNull(groups = Modification.class, message = "est obligatoire en modification") Long version) {
}
