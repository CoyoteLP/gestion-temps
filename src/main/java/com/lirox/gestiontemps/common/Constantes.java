package com.lirox.gestiontemps.common;

/**
 * Constantes métier et techniques partagées par l'application.
 * <p>
 * Toute valeur significative (limite, seuil, valeur par défaut) est déclarée ici plutôt qu'écrite
 * en dur dans le code. Les constantes de type primitif ou {@code String} sont utilisables dans les
 * annotations (ex. {@code @Max(Constantes.MAX_HEURES_JOUR)}).
 */
public final class Constantes {

	/** Nombre maximal d'heures saisissables par un utilisateur sur une journée. */
	public static final int MAX_HEURES_JOUR = 24;

	/** Durée minimale d'une saisie de temps, en heures (texte : utilisable dans {@code @DecimalMin}). */
	public static final String DUREE_MIN_SAISIE = "0.5";

	/** Durée maximale d'une saisie de temps, en heures (texte : utilisable dans {@code @DecimalMax}). */
	public static final String DUREE_MAX_SAISIE = "24.0";

	/** Pas d'une durée de saisie : la durée doit en être un multiple, en heures. */
	public static final String PAS_DUREE_SAISIE = "0.5";

	private Constantes() {
	}

}
