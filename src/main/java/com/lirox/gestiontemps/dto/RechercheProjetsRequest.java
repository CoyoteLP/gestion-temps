package com.lirox.gestiontemps.dto;

import jakarta.validation.constraints.Size;

/**
 * Filtres et tri de la liste des projets, lus dans les paramètres de la requête. Un filtre texte
 * cherche les éléments qui contiennent la saisie, sans tenir compte de la casse ni des accents ; un
 * filtre absent ou vide est ignoré.
 *
 * @param code  code contenant ce texte
 * @param nom   nom contenant ce texte
 * @param actif statut (null = tous)
 * @param tri   colonne de tri, parmi celles admises ; sans elle, identifiant croissant
 * @param sens  sens du tri ; croissant par défaut
 */
public record RechercheProjetsRequest(
		@Size(max = 100) String code,
		@Size(max = 100) String nom,
		Boolean actif,
		TriProjet tri,
		SensTri sens) {
}
