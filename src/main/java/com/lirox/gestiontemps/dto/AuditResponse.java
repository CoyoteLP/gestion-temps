package com.lirox.gestiontemps.dto;

import java.time.Instant;

import com.lirox.gestiontemps.domain.EntiteAuditee;

/**
 * Traçabilité d'une ressource renvoyée par l'API (champ {@code audit} des réponses), en lecture seule.
 *
 * @param creeLe     instant de création (UTC, ex. {@code 2026-11-02T08:30:00Z})
 * @param creePar    auteur de la création (email, ou identifiant du compte à défaut) ; null si inconnu
 * @param modifieLe  instant de la dernière modification (égal à {@code creeLe} si jamais modifiée)
 * @param modifiePar auteur de la dernière modification ; null si inconnu
 */
public record AuditResponse(
		Instant creeLe,
		String creePar,
		Instant modifieLe,
		String modifiePar) {

	/**
	 * @param entite entité auditée
	 * @return sa traçabilité
	 */
	public static AuditResponse from(EntiteAuditee entite) {
		return new AuditResponse(entite.getCreeLe(), entite.getCreePar(), entite.getModifieLe(),
				entite.getModifiePar());
	}

}
