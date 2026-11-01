package com.lirox.gestiontemps.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.SaisieTempsRequest;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

/**
 * Règles du {@link SaisieTempsService} qui ne se vérifient qu'avec des transactions réellement
 * validées (accès concurrents, verrous) : pas de {@code @Transactional} sur la classe, la base est
 * vidée après chaque test.
 */
@SpringBootTest
@ActiveProfiles("test")
class SaisieTempsServiceTest {

	private static final LocalDate JOUR = LocalDate.of(2026, 10, 30);

	/** Nombre de requêtes simultanées : 8 × 4 h = 32 h, au-delà de la limite journalière. */
	private static final int NOMBRE_REQUETES = 8;

	private static final int DUREE_DEMANDEE = 4;

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
	private TransactionTemplate transactionTemplate;

	@AfterEach
	void viderLaBase() {
		saisieTempsRepository.deleteAll();
		tacheRepository.deleteAll();
		projetRepository.deleteAll();
		utilisateurRepository.deleteAll();
	}

	/**
	 * Huit saisies de 4 h créées en même temps pour le même utilisateur et le même jour : six sont
	 * acceptées (24 h), les deux autres refusées par la règle des 24 h.
	 */
	@Test
	void createConcurrentsNeDepassentPasLeTotalJournalier() throws Exception {
		Utilisateur utilisateur = saveUtilisateur();
		Tache tache = saveTache();
		SaisieTempsRequest request = request(utilisateur, tache, null);
		List<Callable<Void>> appels = new ArrayList<>();
		for (int i = 0; i < NOMBRE_REQUETES; i++) {
			appels.add(() -> {
				saisieTempsService.create(request);
				return null;
			});
		}

		int acceptees = executerEnMemeTemps(appels);

		assertThat(totalJournee(utilisateur)).isLessThanOrEqualTo(BigDecimal.valueOf(Constantes.MAX_HEURES_JOUR));
		assertThat(acceptees).isEqualTo(Constantes.MAX_HEURES_JOUR / DUREE_DEMANDEE);
	}

	/**
	 * Huit saisies d'1 h (8 h au total) passées en même temps à 4 h chacune : chaque modification
	 * acceptée ajoute 3 h, donc cinq sont acceptées (8 + 5 × 3 = 23 h) et les trois autres refusées.
	 */
	@Test
	void updatesConcurrentsNeDepassentPasLeTotalJournalier() throws Exception {
		Utilisateur utilisateur = saveUtilisateur();
		Tache tache = saveTache();
		List<Callable<Void>> appels = new ArrayList<>();
		for (int i = 0; i < NOMBRE_REQUETES; i++) {
			SaisieTemps saisie = saveSaisie(utilisateur, tache, BigDecimal.ONE);
			SaisieTempsRequest request = request(utilisateur, tache, saisie.getVersion());
			appels.add(() -> {
				saisieTempsService.update(saisie.getId(), request);
				return null;
			});
		}

		int acceptees = executerEnMemeTemps(appels);

		assertThat(totalJournee(utilisateur)).isLessThanOrEqualTo(BigDecimal.valueOf(Constantes.MAX_HEURES_JOUR));
		assertThat(acceptees).isEqualTo((Constantes.MAX_HEURES_JOUR - NOMBRE_REQUETES) / (DUREE_DEMANDEE - 1));
	}

	/**
	 * Une autre transaction garde le verrou de l'utilisateur : la saisie attend le délai configuré
	 * puis échoue, au lieu d'attendre indéfiniment, et rien n'est enregistré.
	 */
	@Test
	void createEchoueApresLeDelaiDuVerrouSiLUtilisateurResteVerrouille() throws Exception {
		Utilisateur utilisateur = saveUtilisateur();
		Tache tache = saveTache();
		CountDownLatch verrouPose = new CountDownLatch(1);
		CountDownLatch liberer = new CountDownLatch(1);
		ExecutorService executor = Executors.newSingleThreadExecutor();
		try {
			Future<?> detenteur = executor.submit(() -> transactionTemplate.executeWithoutResult(statut -> {
				utilisateurRepository.findVerrouilleById(utilisateur.getId());
				verrouPose.countDown();
				attendre(liberer);
			}));
			assertThat(verrouPose.await(10, TimeUnit.SECONDS)).isTrue();

			long debut = System.nanoTime();
			assertThatThrownBy(() -> saisieTempsService.create(request(utilisateur, tache, null)))
					.isInstanceOf(PessimisticLockingFailureException.class);
			Duration attente = Duration.ofNanos(System.nanoTime() - debut);

			long delai = Long.parseLong(Constantes.DELAI_VERROU_UTILISATEUR_MS);
			assertThat(attente.toMillis()).isBetween(delai - 1000, delai + 5000);
			liberer.countDown();
			detenteur.get(10, TimeUnit.SECONDS);
		}
		finally {
			liberer.countDown();
			executor.shutdownNow();
		}
		assertThat(saisieTempsRepository.count()).isZero();
	}

	/**
	 * Lance les appels en même temps et compte ceux acceptés ; un refus doit venir de la règle des
	 * 24 h ({@link BusinessRuleException}), toute autre exception fait échouer le test.
	 */
	private static int executerEnMemeTemps(List<Callable<Void>> appels) throws Exception {
		CountDownLatch depart = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(appels.size());
		try {
			List<Future<Boolean>> resultats = new ArrayList<>();
			for (Callable<Void> appel : appels) {
				resultats.add(executor.submit(() -> {
					depart.await();
					try {
						appel.call();
						return true;
					}
					catch (BusinessRuleException e) {
						return false;
					}
				}));
			}
			depart.countDown();
			int acceptees = 0;
			for (Future<Boolean> resultat : resultats) {
				if (resultat.get(60, TimeUnit.SECONDS)) {
					acceptees++;
				}
			}
			return acceptees;
		}
		finally {
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

	private static SaisieTempsRequest request(Utilisateur utilisateur, Tache tache, Long version) {
		return new SaisieTempsRequest(utilisateur.getId(), tache.getId(), JOUR, BigDecimal.valueOf(DUREE_DEMANDEE),
				null, version);
	}

	private BigDecimal totalJournee(Utilisateur utilisateur) {
		return saisieTempsRepository.totalJournee(utilisateur.getId(), JOUR, null);
	}

	private Utilisateur saveUtilisateur() {
		Utilisateur utilisateur = new Utilisateur();
		utilisateur.setEmail("concurrence@lirox.com");
		utilisateur.setNom("Dupont");
		utilisateur.setPrenom("Jean");
		return utilisateurRepository.save(utilisateur);
	}

	private Tache saveTache() {
		Projet projet = new Projet();
		projet.setCode("PRJ-CONC");
		projet.setNom("Projet concurrence");
		projetRepository.save(projet);
		Tache tache = new Tache();
		tache.setProjet(projet);
		tache.setLibelle("Dev");
		return tacheRepository.save(tache);
	}

	private SaisieTemps saveSaisie(Utilisateur utilisateur, Tache tache, BigDecimal duree) {
		SaisieTemps saisie = new SaisieTemps();
		saisie.setUtilisateur(utilisateur);
		saisie.setTache(tache);
		saisie.setJour(JOUR);
		saisie.setDuree(duree);
		return saisieTempsRepository.save(saisie);
	}

}
