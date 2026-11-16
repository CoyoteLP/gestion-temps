package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;

/**
 * Sens du tri d'une liste ({@code sens=asc} ou {@code sens=desc}) ; croissant par défaut.
 */
public enum SensTri implements ValeurParametre {

	/** Croissant. */
	ASC("asc", Sort.Direction.ASC),

	/** Décroissant. */
	DESC("desc", Sort.Direction.DESC);

	private final String valeur;
	private final Sort.Direction direction;

	SensTri(String valeur, Sort.Direction direction) {
		this.valeur = valeur;
		this.direction = direction;
	}

	@Override
	public String valeur() {
		return valeur;
	}

	/**
	 * @return la direction Spring Data correspondante
	 */
	public Sort.Direction direction() {
		return direction;
	}

}
