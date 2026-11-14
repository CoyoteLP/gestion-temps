package com.lirox.gestiontemps.common;

/**
 * Motif {@code like} d'un filtre texte « contient », passé en paramètre lié d'une requête JPQL (jamais
 * concaténé à la requête). Les caractères jokers saisis ({@code %}, {@code _}) sont échappés pour être
 * cherchés tels quels, avec le caractère d'échappement {@link #ECHAPPEMENT} déclaré dans la requête
 * ({@code like :motif escape '!'}). La casse et les accents sont ignorés par la collation de la base.
 */
public final class MotifRecherche {

	/** Caractère d'échappement des motifs, à reprendre dans la clause {@code escape} des requêtes. */
	public static final char ECHAPPEMENT = '!';

	private MotifRecherche() {
	}

	/**
	 * @param saisie texte cherché, éventuellement vide
	 * @return le motif {@code %texte%} échappé, ou null si la saisie est vide (filtre ignoré)
	 */
	public static String contient(String saisie) {
		if (saisie == null || saisie.isBlank()) {
			return null;
		}
		String texte = saisie.strip()
				.replace(String.valueOf(ECHAPPEMENT), "" + ECHAPPEMENT + ECHAPPEMENT)
				.replace("%", ECHAPPEMENT + "%")
				.replace("_", ECHAPPEMENT + "_");
		return "%" + texte + "%";
	}

}
