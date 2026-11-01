package com.lirox.gestiontemps.service;

import com.lirox.gestiontemps.exception.ModificationConcurrenteException;

/**
 * Contrôle de la version envoyée par le client lors d'une modification : elle doit être celle de la
 * ressource en base, sinon le client modifie une donnée qu'il n'a pas vue.
 * <p>
 * Ce contrôle couvre le cas où le client a lu une version ancienne ; le {@code @Version} des
 * entités couvre en plus deux modifications simultanées (conflit détecté à l'écriture).
 */
final class VerrouOptimiste {

	private VerrouOptimiste() {
	}

	/**
	 * @param versionActuelle version de l'entité en base
	 * @param versionRecue    version envoyée par le client
	 * @throws ModificationConcurrenteException si les deux versions diffèrent
	 */
	static void verifier(Long versionActuelle, Long versionRecue) {
		if (!versionActuelle.equals(versionRecue)) {
			throw new ModificationConcurrenteException();
		}
	}

}
