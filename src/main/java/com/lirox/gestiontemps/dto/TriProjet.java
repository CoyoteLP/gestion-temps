package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;

/**
 * Colonnes de tri des projets ({@code GET /api/projets?tri=}).
 */
public enum TriProjet implements ColonneTri {

	/** Code. */
	CODE("code", "code"),

	/** Nom. */
	NOM("nom", "nom"),

	/** Période, par date de début ; un projet sans date de début vient en dernier. */
	DATE_DEBUT("dateDebut", "dateDebut"),

	/** Statut (inactifs, puis actifs en ordre croissant). */
	ACTIF("actif", "actif");

	private final String valeur;
	private final String[] proprietes;

	TriProjet(String valeur, String... proprietes) {
		this.valeur = valeur;
		this.proprietes = proprietes;
	}

	@Override
	public String valeur() {
		return valeur;
	}

	@Override
	public Sort versSort(Sort.Direction direction) {
		// Seule la date de début peut être vide
		return this == DATE_DEBUT ? ColonneTri.trierParFacultative(direction, proprietes[0])
				: ColonneTri.trierPar(direction, proprietes);
	}

}
