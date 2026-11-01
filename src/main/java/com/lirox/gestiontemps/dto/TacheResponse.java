package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.Tache;

/**
 * Tâche renvoyée par l'API.
 *
 * @param id          identifiant
 * @param version     version courante, à renvoyer pour modifier la tâche
 * @param projetId    projet de rattachement
 * @param libelle     libellé de la tâche
 * @param description description libre
 * @param actif       false si la tâche est désactivée
 */
public record TacheResponse(
		Long id,
		long version,
		Long projetId,
		String libelle,
		String description,
		boolean actif) {

	/**
	 * @param tache entité à convertir (son projet doit être chargeable : appeler dans une transaction)
	 * @return la représentation API de la tâche
	 */
	public static TacheResponse from(Tache tache) {
		return new TacheResponse(tache.getId(), tache.getVersion(), tache.getProjet().getId(), tache.getLibelle(),
				tache.getDescription(), tache.isActif());
	}

}
