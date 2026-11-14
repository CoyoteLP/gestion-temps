package com.lirox.gestiontemps.dto;

import jakarta.validation.constraints.Size;

/**
 * Filtres et tri de la liste des utilisateurs, lus dans les paramètres de la requête. Un filtre
 * texte cherche les éléments qui contiennent la saisie, sans tenir compte de la casse ni des
 * accents ; un filtre absent ou vide est ignoré.
 *
 * @param nom   nom ou prénom contenant ce texte
 * @param email email contenant ce texte
 * @param actif statut ({@code false} : comptes en attente de validation ou désactivés ; null = tous)
 * @param tri   colonne de tri, parmi celles admises ; sans elle, identifiant croissant
 * @param sens  sens du tri ; croissant par défaut
 */
public record RechercheUtilisateursRequest(
		@Size(max = 100) String nom,
		@Size(max = 150) String email,
		Boolean actif,
		TriUtilisateur tri,
		SensTri sens) {
}
