package com.lirox.gestiontemps.dto;

import com.lirox.gestiontemps.domain.RoleProjet;

import jakarta.validation.constraints.Size;

/**
 * Filtres et tri de la liste des membres d'un projet, lus dans les paramètres de la requête. Un
 * filtre texte cherche les éléments qui contiennent la saisie, sans tenir compte de la casse ni des
 * accents ; un filtre absent ou vide est ignoré.
 *
 * @param nom   nom ou prénom de l'utilisateur contenant ce texte
 * @param email email de l'utilisateur contenant ce texte
 * @param role  rôle dans le projet (null = tous)
 * @param tri   colonne de tri, parmi celles admises ; sans elle, identifiant croissant
 * @param sens  sens du tri ; croissant par défaut
 */
public record RechercheMembresRequest(
		@Size(max = 100) String nom,
		@Size(max = 150) String email,
		RoleProjet role,
		TriMembre tri,
		SensTri sens) {
}
