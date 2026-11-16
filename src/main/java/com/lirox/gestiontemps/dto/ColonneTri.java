package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;

/**
 * Colonne de tri admise pour une liste : chaque ressource déclare les siennes dans une énumération
 * ({@link TriProjet}…), qui fait office de liste blanche. Le client ne choisit jamais un nom de
 * propriété librement.
 */
public interface ColonneTri extends ValeurParametre {

	/**
	 * @param direction sens demandé
	 * @return le tri correspondant à la colonne (une ou plusieurs propriétés), sans le départage par
	 *         identifiant, ajouté par {@link PaginationRequest#versPageRequest(ColonneTri, SensTri)}
	 */
	Sort versSort(Sort.Direction direction);

	/**
	 * @param direction  sens demandé
	 * @param proprietes propriétés obligatoires de l'entité, dans l'ordre
	 * @return le tri sur ces propriétés
	 */
	static Sort trierPar(Sort.Direction direction, String... proprietes) {
		return Sort.by(direction, proprietes);
	}

	/**
	 * Tri sur une propriété facultative. MariaDB ne connaît pas {@code NULLS LAST} : Hibernate
	 * l'émule par une expression, qui empêche l'usage d'un index pour trier ; elle est donc réservée
	 * aux colonnes qui peuvent être vides.
	 *
	 * @param direction sens demandé
	 * @param propriete propriété facultative de l'entité
	 * @return le tri sur cette propriété, valeurs absentes en dernier quel que soit le sens
	 */
	static Sort trierParFacultative(Sort.Direction direction, String propriete) {
		return Sort.by(new Sort.Order(direction, propriete).nullsLast());
	}

}
