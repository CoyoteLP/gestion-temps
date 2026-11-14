package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;

/**
 * Colonnes de tri des utilisateurs ({@code GET /api/utilisateurs?tri=}).
 */
public enum TriUtilisateur implements ColonneTri {

	/** Nom, puis prénom. */
	NOM("nom", "nom", "prenom"),

	/** Email. */
	EMAIL("email", "email"),

	/** Date d'inscription (création de la fiche). */
	CREE_LE("creeLe", "creeLe"),

	/** Statut (inactifs, puis actifs en ordre croissant). */
	ACTIF("actif", "actif");

	private final String valeur;
	private final String[] proprietes;

	TriUtilisateur(String valeur, String... proprietes) {
		this.valeur = valeur;
		this.proprietes = proprietes;
	}

	@Override
	public String valeur() {
		return valeur;
	}

	@Override
	public Sort versSort(Sort.Direction direction) {
		return ColonneTri.trierPar(direction, proprietes);
	}

}
