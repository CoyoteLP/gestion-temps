package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.Utilisateur;

/**
 * Utilisateur renvoyé par l'API.
 *
 * @param id      identifiant
 * @param version version courante, à renvoyer pour modifier l'utilisateur
 * @param email   adresse email
 * @param nom     nom de famille
 * @param prenom  prénom
 * @param actif   false si l'utilisateur est désactivé
 * @param audit   date et auteur de la création et de la dernière modification
 */
public record UtilisateurResponse(
		Long id,
		long version,
		String email,
		String nom,
		String prenom,
		boolean actif,
		AuditResponse audit) {

	/**
	 * @param utilisateur entité à convertir
	 * @return la représentation API de l'utilisateur
	 */
	public static UtilisateurResponse from(Utilisateur utilisateur) {
		return new UtilisateurResponse(utilisateur.getId(), utilisateur.getVersion(), utilisateur.getEmail(),
				utilisateur.getNom(), utilisateur.getPrenom(), utilisateur.isActif(), AuditResponse.from(utilisateur));
	}

}
