package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.Utilisateur;

/**
 * Utilisateur renvoyé par l'API.
 *
 * @param id     identifiant
 * @param email  adresse email
 * @param nom    nom de famille
 * @param prenom prénom
 * @param actif  false si l'utilisateur est désactivé
 */
public record UtilisateurResponse(
		Long id,
		String email,
		String nom,
		String prenom,
		boolean actif) {

	/**
	 * @param utilisateur entité à convertir
	 * @return la représentation API de l'utilisateur
	 */
	public static UtilisateurResponse from(Utilisateur utilisateur) {
		return new UtilisateurResponse(utilisateur.getId(), utilisateur.getEmail(), utilisateur.getNom(),
				utilisateur.getPrenom(), utilisateur.isActif());
	}

}
