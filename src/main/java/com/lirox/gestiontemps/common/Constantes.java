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

	/** Nombre d'éléments par page d'une liste quand le client ne précise pas {@code taille}. */
	public static final int TAILLE_PAGE_PAR_DEFAUT = 20;

	/** Nombre maximal d'éléments par page : une taille demandée au-delà y est ramenée. */
	public static final int TAILLE_PAGE_MAX = 100;

	/**
	 * Numéro de page maximal : au-delà, le décalage (page × taille) dépasserait la capacité d'un
	 * {@code int}, que Spring Data refuse.
	 */
	public static final int PAGE_MAX = Integer.MAX_VALUE / TAILLE_PAGE_MAX;

	/** Étendue maximale d'une recherche de saisies (de {@code du} à {@code au} inclus), en années. */
	public static final int DUREE_MAX_RECHERCHE_ANNEES = 1;

	/**
	 * En-tête HTTP de l'identifiant de corrélation d'une requête : repris de la requête s'il est
	 * valide, sinon généré, et renvoyé dans la réponse pour retrouver les logs d'un appel.
	 */
	public static final String EN_TETE_CORRELATION = "X-Correlation-Id";

	/**
	 * Clé de l'identifiant de corrélation dans le contexte des logs (MDC) : champ des logs JSON, et
	 * repris par {@code logging.pattern.correlation} dans {@code application.yml}.
	 */
	public static final String CLE_LOG_CORRELATION = "correlationId";

	/**
	 * Format accepté d'un identifiant de corrélation reçu : court, sans espace ni retour à la ligne
	 * qui permettrait de falsifier une ligne de log.
	 */
	public static final String FORMAT_IDENTIFIANT_CORRELATION = "[A-Za-z0-9._-]{1,64}";

	private Constantes() {
	}

}
