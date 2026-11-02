package com.lirox.gestiontemps.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.ClotureRequest;
import com.lirox.gestiontemps.dto.ClotureResponse;
import com.lirox.gestiontemps.dto.SaisieTempsRequest;
import com.lirox.gestiontemps.dto.SaisieTempsResponse;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.repository.ClotureRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

/**
 * Clôture et saisies concurrentes sur le même projet, avec des transactions réellement validées :
 * pas de {@code @Transactional} sur la classe, la base est vidée après chaque test.
 */
@SpringBootTest
@ActiveProfiles("test")
class ClotureServiceTest {

	/** Délai laissé à une transaction pour atteindre son verrou avant que l'autre ne poursuive. */
	private static final long PAUSE_ATTEINTE_VERROU_MS = 1000;

	private static final JwtAuthenticationToken ADMIN = new JwtAuthenticationToken(
			Jwt.withTokenValue("jeton").header("alg", "none").subject("admin-test").build(),
			List.of(new SimpleGrantedAuthority("ROLE_" + Constantes.ROLE_ADMIN)));

	@Autowired
	private ClotureService clotureService;

	@Autowired
	private SaisieTempsService saisieTempsService;

	@Autowired
	private ProjetRepository projetRepository;

	@Autowired
	private TacheRepository tacheRepository;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private SaisieTempsRepository saisieTempsRepository;

	@Autowired
	private ClotureRepository clotureRepository;

	@Autowired
	private TransactionTemplate transactionTemplate;

	@BeforeEach
	void authentifierEnAdministrateur() {
		SecurityContextHolder.getContext().setAuthentication(ADMIN);
	}

	@AfterEach
	void viderLaBase() {
		SecurityContextHolder.clearContext();
		saisieTempsRepository.deleteAll();
		clotureRepository.deleteAll();
		tacheRepository.deleteAll();
		projetRepository.deleteAll();
		utilisateurRepository.deleteAll();
	}

	/**
	 * Une écriture de saisie est en cours sur le projet (verrou partagé posé) : la clôture attend
	 * qu'elle se termine au lieu de s'intercaler, puis toute nouvelle saisie du mois est refusée.
	 */
	@Test
	void uneClotureAttendLaFinDesSaisiesEnCoursPuisLesSuivantesSontRefusees() throws Exception {
		Tache tache = saveTache("PRJ-CLOT");
		Utilisateur utilisateur = saveUtilisateur();
		Long projetId = tache.getProjet().getId();
		YearMonth moisTermine = YearMonth.now(ZoneId.of(Constantes.FUSEAU_HORAIRE)).minusMonths(1);
		CountDownLatch verrouPose = new CountDownLatch(1);
		CountDownLatch liberer = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(2);
		try {
			Future<?> saisieEnCours = executor.submit(() -> transactionTemplate.executeWithoutResult(statut -> {
				projetRepository.findPartageById(projetId);
				verrouPose.countDown();
				attendre(liberer);
			}));
			assertThat(verrouPose.await(10, TimeUnit.SECONDS)).isTrue();

			Future<ClotureResponse> cloture = executor.submit(() -> {
				SecurityContextHolder.getContext().setAuthentication(ADMIN);
				return clotureService.create(new ClotureRequest(projetId, moisTermine));
			});
			assertThatThrownBy(() -> cloture.get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);

			liberer.countDown();
			saisieEnCours.get(10, TimeUnit.SECONDS);
			assertThat(cloture.get(10, TimeUnit.SECONDS).mois()).isEqualTo(moisTermine);
		}
		finally {
			liberer.countDown();
			executor.shutdownNow();
		}

		SaisieTempsRequest request = new SaisieTempsRequest(utilisateur.getId(), tache.getId(),
				moisTermine.atDay(10), BigDecimal.ONE, null, null);
		assertThatThrownBy(() -> saisieTempsService.create(request)).isInstanceOf(BusinessRuleException.class);
		assertThat(saisieTempsRepository.count()).isZero();
	}

	/**
	 * Une saisie est déplacée du projet B vers le projet A (identifiant de A inférieur) pendant qu'une
	 * clôture de tous les projets verrouille A puis B. Si la saisie verrouillait B (son projet actuel)
	 * avant A, les deux transactions s'attendraient et MariaDB en annulerait une (interblocage). Les
	 * projets étant verrouillés par identifiant croissant, la saisie attend A sans tenir B : la
	 * clôture obtient B et se termine, puis le déplacement aboutit.
	 */
	@Test
	void unDeplacementEntreProjetsEtUneClotureGlobaleNeSInterbloquentPas() throws Exception {
		Tache tacheA = saveTache("PRJ-A");
		Tache tacheB = saveTache("PRJ-B");
		assertThat(tacheA.getProjet().getId()).isLessThan(tacheB.getProjet().getId());
		Utilisateur utilisateur = saveUtilisateur();
		LocalDate jour = LocalDate.now(ZoneId.of(Constantes.FUSEAU_HORAIRE));
		SaisieTemps saisie = saveSaisie(utilisateur, tacheB, jour);
		CountDownLatch aVerrouille = new CountDownLatch(1);
		CountDownLatch deplacementLance = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(2);
		try {
			// Clôture globale : verrouille A, laisse le déplacement atteindre ses verrous, puis verrouille B
			Future<?> clotureGlobale = executor.submit(() -> transactionTemplate.executeWithoutResult(statut -> {
				projetRepository.findVerrouilleById(tacheA.getProjet().getId());
				aVerrouille.countDown();
				attendre(deplacementLance);
				pause(PAUSE_ATTEINTE_VERROU_MS);
				projetRepository.findVerrouilleById(tacheB.getProjet().getId());
			}));
			assertThat(aVerrouille.await(10, TimeUnit.SECONDS)).isTrue();

			SaisieTempsRequest versA = new SaisieTempsRequest(utilisateur.getId(), tacheA.getId(), jour,
					BigDecimal.ONE, null, saisie.getVersion());
			Future<SaisieTempsResponse> deplacement = executor.submit(() -> {
				SecurityContextHolder.getContext().setAuthentication(ADMIN);
				deplacementLance.countDown();
				return saisieTempsService.update(saisie.getId(), versA);
			});

			clotureGlobale.get(15, TimeUnit.SECONDS);
			assertThat(deplacement.get(15, TimeUnit.SECONDS).tacheId()).isEqualTo(tacheA.getId());
		}
		finally {
			deplacementLance.countDown();
			executor.shutdownNow();
		}
	}

	private static void attendre(CountDownLatch latch) {
		try {
			latch.await(30, TimeUnit.SECONDS);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	/** Laisse à l'autre transaction le temps d'atteindre et d'attendre son verrou. */
	private static void pause(long millisecondes) {
		try {
			Thread.sleep(millisecondes);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	private SaisieTemps saveSaisie(Utilisateur utilisateur, Tache tache, LocalDate jour) {
		SaisieTemps saisie = new SaisieTemps();
		saisie.setUtilisateur(utilisateur);
		saisie.setTache(tache);
		saisie.setJour(jour);
		saisie.setDuree(BigDecimal.ONE);
		return saisieTempsRepository.save(saisie);
	}

	private Tache saveTache(String code) {
		Projet projet = new Projet();
		projet.setCode(code);
		projet.setNom("Projet " + code);
		projetRepository.save(projet);
		Tache tache = new Tache();
		tache.setProjet(projet);
		tache.setLibelle("Dev");
		return tacheRepository.save(tache);
	}

	private Utilisateur saveUtilisateur() {
		Utilisateur utilisateur = new Utilisateur();
		utilisateur.setEmail("cloture@lirox.com");
		utilisateur.setNom("Dupont");
		utilisateur.setPrenom("Jean");
		return utilisateurRepository.save(utilisateur);
	}

}
