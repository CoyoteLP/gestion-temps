package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.validation.Modification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Modification de son propre profil ({@code PUT /api/utilisateurs/moi}). L'email est géré par le
 * fournisseur d'identité et l'état actif par un administrateur : ils ne sont pas modifiables ici.
 *
 * @param nom     nom de famille
 * @param prenom  prénom
 * @param version version lue avant modification, obligatoire ; un écart avec la version en base
 *                renvoie 409
 */
public record ProfilRequest(
		@NotBlank @Size(max = 100) String nom,
		@NotBlank @Size(max = 100) String prenom,
		@NotNull(groups = Modification.class, message = "est obligatoire en modification") Long version) {
}
