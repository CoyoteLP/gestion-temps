package com.lirox.gestiontemps.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.config.ProprietesSecurite;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

import lombok.RequiredArgsConstructor;

/**
 * Identité de l'appelant, déduite du jeton OIDC de la requête en cours.
 * <p>
 * Rattachement d'un compte : l'administrateur crée l'utilisateur avec son email ; à sa première
 * connexion, l'utilisateur est retrouvé par l'email du jeton, à condition que le fournisseur le
 * déclare vérifié ({@code email_verified}, voir {@link ProprietesSecurite#exigerEmailVerifie()}),
 * et la revendication {@code sub} est enregistrée. Elle seule sert ensuite.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurCourantService {

	private static final String CLAIM_EMAIL = "email";
	private static final String CLAIM_EMAIL_VERIFIE = "email_verified";
	private static final String PREFIXE_ROLE = "ROLE_";

	private final UtilisateurRepository utilisateurRepository;
	private final ProprietesSecurite proprietesSecurite;

	/**
	 * @return true si le jeton de l'appelant porte le rôle {@link Constantes#ROLE_ADMIN}
	 */
	public boolean estAdmin() {
		Authentication authentification = SecurityContextHolder.getContext().getAuthentication();
		return authentification != null && authentification.getAuthorities().stream()
				.anyMatch(role -> (PREFIXE_ROLE + Constantes.ROLE_ADMIN).equals(role.getAuthority()));
	}

	/**
	 * Utilisateur de l'appelant ; réservé aux autres services du paquet. Le rattachement par email
	 * n'est enregistré que dans une transaction en écriture (sinon il est refait à la requête suivante).
	 *
	 * @return l'utilisateur rattaché au compte de l'appelant
	 * @throws AccesRefuseException si aucun utilisateur actif ne correspond au compte
	 */
	Utilisateur get() {
		Jwt jeton = jeton();
		Utilisateur utilisateur = utilisateurRepository.findBySujet(jeton.getSubject())
				.orElseGet(() -> rattacherParEmail(jeton));
		if (!utilisateur.isActif()) {
			throw new AccesRefuseException("Votre compte est désactivé : contactez un administrateur");
		}
		return utilisateur;
	}

	private Utilisateur rattacherParEmail(Jwt jeton) {
		String email = jeton.getClaimAsString(CLAIM_EMAIL);
		if (email == null || !emailVerifie(jeton)) {
			throw compteInconnu();
		}
		Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
				.orElseThrow(UtilisateurCourantService::compteInconnu);
		if (utilisateur.getSujet() != null) {
			// Email déjà rattaché à un autre compte du fournisseur : refuser plutôt que d'usurper
			throw compteInconnu();
		}
		if (!TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
			utilisateur.setSujet(jeton.getSubject());
		}
		return utilisateur;
	}

	/** Email déclaré vérifié ; une revendication absente n'est acceptée que si la configuration l'autorise. */
	private boolean emailVerifie(Jwt jeton) {
		Boolean verifie = jeton.getClaimAsBoolean(CLAIM_EMAIL_VERIFIE);
		return verifie == null ? !proprietesSecurite.exigerEmailVerifie() : verifie;
	}

	private static Jwt jeton() {
		Authentication authentification = SecurityContextHolder.getContext().getAuthentication();
		if (authentification instanceof JwtAuthenticationToken jwt) {
			return jwt.getToken();
		}
		throw compteInconnu();
	}

	private static AccesRefuseException compteInconnu() {
		return new AccesRefuseException("Aucun utilisateur ne correspond à votre compte : contactez un administrateur");
	}

}
