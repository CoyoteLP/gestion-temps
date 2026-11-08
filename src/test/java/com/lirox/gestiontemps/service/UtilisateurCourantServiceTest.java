package com.lirox.gestiontemps.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.config.ProprietesSecurite;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

import jakarta.persistence.EntityManager;

/**
 * Identification de l'appelant à partir de son jeton et rattachement de son compte par email.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UtilisateurCourantServiceTest {

	private static final String COMPTE_INCONNU =
			"Aucun utilisateur ne correspond à votre compte : contactez un administrateur";

	@Autowired
	private UtilisateurCourantService utilisateurCourantService;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private EntityManager entityManager;

	@AfterEach
	void oublierLAppelant() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void retrouveLUtilisateurParSonSujet() {
		Utilisateur utilisateur = save("jdupont@lirox.com", "sujet-1");
		authentifier("sujet-1", Map.of("email", "autre@lirox.com"));
		assertThat(utilisateurCourantService.get().getId()).isEqualTo(utilisateur.getId());
	}

	@Test
	void rattacheLeCompteParEmailALaPremiereConnexion() {
		Utilisateur utilisateur = save("jdupont@lirox.com", null);
		authentifier("sujet-1", Map.of("email", "JDupont@lirox.com", "email_verified", true));
		assertThat(utilisateurCourantService.get().getId()).isEqualTo(utilisateur.getId());
		assertThat(utilisateurRepository.findBySujet("sujet-1")).map(Utilisateur::getId).contains(utilisateur.getId());
	}

	@Test
	void leRattachementNeChangePasLaVersionDeLaFiche() {
		Utilisateur utilisateur = save("jdupont@lirox.com", null);
		utilisateurRepository.flush();
		authentifier("sujet-1", Map.of("email", "jdupont@lirox.com", "email_verified", true));
		utilisateurCourantService.get();
		entityManager.clear();
		Utilisateur relu = utilisateurRepository.findBySujet("sujet-1").orElseThrow();
		assertThat(relu.getId()).isEqualTo(utilisateur.getId());
		assertThat(relu.getVersion()).isZero();
		assertThat(relu.getModifieLe()).isEqualTo(utilisateur.getModifieLe());
		assertThat(relu.getModifiePar()).isNull();
	}

	@Test
	void refuseUnEmailDeclareNonVerifie() {
		save("jdupont@lirox.com", null);
		authentifier("sujet-1", Map.of("email", "jdupont@lirox.com", "email_verified", false));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage(COMPTE_INCONNU);
		assertThat(utilisateurRepository.findBySujet("sujet-1")).isEmpty();
	}

	@Test
	void refuseParDefautUnJetonSansRevendicationEmailVerified() {
		save("jdupont@lirox.com", null);
		authentifier("sujet-1", Map.of("email", "jdupont@lirox.com"));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage(COMPTE_INCONNU);
		assertThat(utilisateurRepository.findBySujet("sujet-1")).isEmpty();
	}

	@Test
	void accepteUnJetonSansRevendicationEmailVerifiedSiLaConfigurationLAutorise() {
		Utilisateur utilisateur = save("jdupont@lirox.com", null);
		UtilisateurCourantService tolerant = new UtilisateurCourantService(utilisateurRepository,
				new ProprietesSecurite("roles", false));
		authentifier("sujet-1", Map.of("email", "jdupont@lirox.com"));
		assertThat(tolerant.get().getId()).isEqualTo(utilisateur.getId());
	}

	@Test
	void refuseToujoursUnEmailDeclareNonVerifieMemeSiLaConfigurationEstTolerante() {
		save("jdupont@lirox.com", null);
		UtilisateurCourantService tolerant = new UtilisateurCourantService(utilisateurRepository,
				new ProprietesSecurite("roles", false));
		authentifier("sujet-1", Map.of("email", "jdupont@lirox.com", "email_verified", false));
		assertThatThrownBy(tolerant::get).isInstanceOf(AccesRefuseException.class);
	}

	@Test
	void refuseUnEmailDejaRattacheAUnAutreCompte() {
		save("jdupont@lirox.com", "sujet-1");
		authentifier("sujet-2", Map.of("email", "jdupont@lirox.com", "email_verified", true));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage(COMPTE_INCONNU);
	}

	/**
	 * L'utilisateur est chargé sans compte rattaché, puis une autre requête lui rattache un premier
	 * compte avant que celle-ci n'enregistre le sien : le second compte est refusé, le premier conservé.
	 */
	@Test
	void refuseUnRattachementSiUnAutreCompteLAObtenuEntreTemps() {
		Utilisateur utilisateur = save("jdupont@lirox.com", null);
		utilisateurRepository.flush();
		// Requête de mise à jour directe : l'entité chargée garde sujet = null, comme dans la requête concurrente
		assertThat(utilisateurRepository.rattacherSujet(utilisateur.getId(), "sujet-1")).isEqualTo(1);
		assertThat(utilisateur.getSujet()).isNull();

		authentifier("sujet-2", Map.of("email", "jdupont@lirox.com", "email_verified", true));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage(COMPTE_INCONNU);

		entityManager.clear();
		assertThat(utilisateurRepository.findBySujet("sujet-1")).map(Utilisateur::getId).contains(utilisateur.getId());
		assertThat(utilisateurRepository.findBySujet("sujet-2")).isEmpty();
	}

	@Test
	void refuseUnCompteSansUtilisateur() {
		authentifier("sujet-1", Map.of("email", "inconnu@lirox.com"));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage(COMPTE_INCONNU);
		authentifier("sujet-1", Map.of());
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class);
	}

	@Test
	void refuseUnUtilisateurDesactive() {
		Utilisateur utilisateur = save("jdupont@lirox.com", "sujet-1");
		utilisateur.setActif(false);
		authentifier("sujet-1", Map.of());
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class)
				.hasMessage("Votre compte est désactivé : contactez un administrateur");
	}

	@Test
	void refuseUnAppelSansJeton() {
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken("jdupont", "secret", List.of()));
		assertThatThrownBy(utilisateurCourantService::get).isInstanceOf(AccesRefuseException.class);
	}

	@Test
	void estAdminSelonLeRoleDuJeton() {
		assertThat(utilisateurCourantService.estAdmin()).isFalse();
		authentifier("sujet-1", Map.of());
		assertThat(utilisateurCourantService.estAdmin()).isFalse();
		authentifier("sujet-1", Map.of(), new SimpleGrantedAuthority("ROLE_" + Constantes.ROLE_ADMIN));
		assertThat(utilisateurCourantService.estAdmin()).isTrue();
	}

	private static void authentifier(String sujet, Map<String, Object> revendications, GrantedAuthority... roles) {
		Jwt.Builder jeton = Jwt.withTokenValue("jeton").header("alg", "none").subject(sujet);
		revendications.forEach(jeton::claim);
		SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jeton.build(), List.of(roles)));
	}

	private Utilisateur save(String email, String sujet) {
		Utilisateur utilisateur = new Utilisateur();
		utilisateur.setEmail(email);
		utilisateur.setNom("Dupont");
		utilisateur.setPrenom("Jean");
		utilisateur.setSujet(sujet);
		return utilisateurRepository.save(utilisateur);
	}

}
