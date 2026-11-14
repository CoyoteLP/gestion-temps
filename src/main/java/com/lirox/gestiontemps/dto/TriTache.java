package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;

/**
 * Colonnes de tri des tâches ({@code GET /api/taches?tri=}).
 */
public enum TriTache implements ColonneTri {

	/** Libellé. */
	LIBELLE("libelle", "libelle"),

	/** Statut (inactives, puis actives en ordre croissant). */
	ACTIF("actif", "actif");

	private final String valeur;
	private final String[] proprietes;

	TriTache(String valeur, String... proprietes) {
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
