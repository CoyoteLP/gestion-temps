package com.lirox.gestiontemps.service;

import java.util.Optional;

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
 * et la revendication {@code sub} est enregistrée. Elle seule sert ensuite. Un utilisateur peut aussi
 * créer lui-même sa fiche (inscription, voir {@code UtilisateurService.createMoi}) : elle est rattachée
 * à son compte dès sa création, et inactive jusqu'à sa validation par un administrateur.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurCourantService {

	private static final String CLAIM_EMAIL = "email";
	private static final String CLAIM_EMAIL_VERIFIE = "email_verified";
	private static final String CLAIM_NOM = "family_name";
	private static final String CLAIM_PRENOM = "given_name";
	private static final String PREFIXE_ROLE = "ROLE_";

	/** Refus d'un compte sans fiche dont l'email n'est pas vérifié : il ne peut pas encore s'inscrire. */
	static final String MESSAGE_EMAIL_NON_VERIFIE =
			"Votre adresse email doit être vérifiée avant l'enregistrement de votre compte";

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
	 * Contrôle d'accès commun à l'API (voir {@code SecurityConfig}) : un administrateur passe
	 * toujours, les autres doivent avoir une fiche active.
	 *
	 * @throws AccesRefuseException si l'appelant n'est pas administrateur et n'a pas de fiche active
	 */
	public void verifierCompteActif() {
		if (!estAdmin()) {
			get();
		}
	}

	/**
	 * Utilisateur de l'appelant ; réservé aux autres services du paquet.
	 *
	 * @return l'utilisateur rattaché au compte de l'appelant
	 * @throws AccesRefuseException si aucun utilisateur actif ne correspond au compte ; le message
	 *                              distingue l'email non vérifié, l'absence de fiche et la fiche inactive
	 */
	Utilisateur get() {
		Utilisateur utilisateur = trouver().orElseThrow(this::sansFiche);
		if (!utilisateur.isActif()) {
			throw new AccesRefuseException(
					"Votre compte n'est pas actif (en attente de validation ou désactivé) : contactez un administrateur");
		}
		return utilisateur;
	}

	/**
	 * Fiche de l'appelant, active ou non : par son compte ({@code sub}), sinon par son email vérifié
	 * si la fiche correspondante n'est rattachée à aucun compte. Le rattachement par email n'est
	 * enregistré que dans une transaction en écriture (sinon il est refait à la requête suivante).
	 *
	 * @return la fiche de l'appelant, ou vide si aucune ne lui correspond
	 * @throws AccesRefuseException si la requête ne porte pas de jeton OIDC
	 */
	Optional<Utilisateur> trouver() {
		Jwt jeton = jeton();
		Optional<Utilisateur> parSujet = utilisateurRepository.findBySujet(jeton.getSubject());
		return parSujet.isPresent() ? parSujet : rattacherParEmail(jeton);
	}

	/**
	 * @return l'identité portée par le jeton de l'appelant, pour créer sa fiche
	 * @throws AccesRefuseException si la requête ne porte pas de jeton OIDC
	 */
	IdentiteJeton identite() {
		Jwt jeton = jeton();
		return new IdentiteJeton(jeton.getSubject(), jeton.getClaimAsString(CLAIM_EMAIL), emailVerifie(jeton),
				jeton.getClaimAsString(CLAIM_NOM), jeton.getClaimAsString(CLAIM_PRENOM));
	}

	private Optional<Utilisateur> rattacherParEmail(Jwt jeton) {
		String email = jeton.getClaimAsString(CLAIM_EMAIL);
		if (email == null || !emailVerifie(jeton)) {
			return Optional.empty();
		}
		// Une fiche déjà rattachée à un autre compte du fournisseur n'est pas reprise : pas d'usurpation
		Optional<Utilisateur> utilisateur = utilisateurRepository.findByEmail(email)
				.filter(fiche -> fiche.getSujet() == null);
		if (utilisateur.isPresent() && !TransactionSynchronizationManager.isCurrentTransactionReadOnly()
				&& utilisateurRepository.rattacherSujet(utilisateur.get().getId(), jeton.getSubject()) == 0) {
			// Rattachée entre-temps par une autre requête, à un autre compte
			return Optional.empty();
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

	/**
	 * Identité de l'appelant selon son jeton.
	 *
	 * @param sujet        identifiant du compte chez le fournisseur ({@code sub})
	 * @param email        email du jeton, ou null
	 * @param emailVerifie true si le fournisseur déclare l'email vérifié (voir la configuration)
	 * @param nom          nom de famille ({@code family_name}), ou null
	 * @param prenom       prénom ({@code given_name}), ou null
	 */
	record IdentiteJeton(String sujet, String email, boolean emailVerifie, String nom, String prenom) {
	}

	/** Refus d'un compte sans fiche : email à vérifier d'abord, sinon compte inconnu. */
	private AccesRefuseException sansFiche() {
		IdentiteJeton identite = identite();
		return identite.email() != null && !identite.emailVerifie()
				? new AccesRefuseException(MESSAGE_EMAIL_NON_VERIFIE)
				: compteInconnu();
	}

	private static AccesRefuseException compteInconnu() {
		return new AccesRefuseException("Aucun utilisateur ne correspond à votre compte : contactez un administrateur");
	}

}
