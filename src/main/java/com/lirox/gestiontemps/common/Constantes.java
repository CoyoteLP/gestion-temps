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

	/**
	 * Fuseau horaire de référence pour la date du jour, indépendant de celui du serveur (souvent UTC
	 * dans un conteneur).
	 */
	public static final String FUSEAU_HORAIRE = "Europe/Paris";

	/**
	 * Attente maximale du verrou posé sur un utilisateur pendant l'écriture de ses saisies, en
	 * millisecondes (texte : utilisable dans {@code @QueryHint}) ; au-delà, la requête est refusée.
	 */
	public static final String DELAI_VERROU_UTILISATEUR_MS = "5000";

	/**
	 * Attente maximale du verrou posé sur un projet (saisie contre clôture du mois), en millisecondes
	 * (texte : utilisable dans {@code @QueryHint}) ; au-delà, la requête est refusée.
	 */
	public static final String DELAI_VERROU_PROJET_MS = "5000";

	/**
	 * Valeur de la revendication des rôles du jeton qui donne les droits d'administration (gestion
	 * des projets, tâches, utilisateurs et membres, accès à toutes les saisies). Sans elle, l'appelant
	 * est un collaborateur.
	 */
	public static final String ROLE_ADMIN = "ADMIN";

	private Constantes() {
	}

}
