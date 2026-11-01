package com.lirox.gestiontemps.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Données de création ou de modification d'un utilisateur.
 *
 * @param email  adresse email, unique
 * @param nom    nom de famille
 * @param prenom prénom
 * @param actif  état de l'utilisateur ; null = actif
 */
public record UtilisateurRequest(
		@NotBlank @Email @Size(max = 150) String email,
		@NotBlank @Size(max = 100) String nom,
		@NotBlank @Size(max = 100) String prenom,
		Boolean actif) {
}
