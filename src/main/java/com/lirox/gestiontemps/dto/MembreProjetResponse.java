package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.RoleProjet;

/**
 * Membre de projet renvoyé par l'API.
 *
 * @param id            identifiant
 * @param version       version courante, à renvoyer pour modifier le membre
 * @param projetId      projet
 * @param utilisateurId utilisateur membre
 * @param role          rôle dans le projet
 * @param audit         date et auteur de la création et de la dernière modification
 */
public record MembreProjetResponse(
		Long id,
		long version,
		Long projetId,
		Long utilisateurId,
		RoleProjet role,
		AuditResponse audit) {

	/**
	 * @param membre entité à convertir (appeler dans une transaction)
	 * @return la représentation API du membre
	 */
	public static MembreProjetResponse from(MembreProjet membre) {
		return new MembreProjetResponse(membre.getId(), membre.getVersion(), membre.getProjet().getId(),
				membre.getUtilisateur().getId(), membre.getRole(), AuditResponse.from(membre));
	}

}
