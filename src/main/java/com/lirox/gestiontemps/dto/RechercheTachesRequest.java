package com.lirox.gestiontemps.dto;

import jakarta.validation.constraints.Size;

/**
 * Filtres et tri de la liste des tâches, lus dans les paramètres de la requête. Un filtre texte
 * cherche les éléments qui contiennent la saisie, sans tenir compte de la casse ni des accents ; un
 * filtre absent ou vide est ignoré.
 *
 * @param projetId tâches de ce projet (null = toutes les tâches visibles)
 * @param libelle  libellé contenant ce texte
 * @param actif    statut (null = tous)
 * @param tri      colonne de tri, parmi celles admises ; sans elle, identifiant croissant
 * @param sens     sens du tri ; croissant par défaut
 */
public record RechercheTachesRequest(
		Long projetId,
		@Size(max = 100) String libelle,
		Boolean actif,
		TriTache tri,
		SensTri sens) {
}
