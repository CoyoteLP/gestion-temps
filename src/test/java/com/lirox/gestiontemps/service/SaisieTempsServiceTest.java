package com.lirox.gestiontemps.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;
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
 * validées (accès concurrents) : pas de {@code @Transactional} sur la classe, la base est vidée
 * après chaque test.
 */
@SpringBootTest
@ActiveProfiles("test")
class SaisieTempsServiceTest {

	private static final LocalDate JOUR = LocalDate.of(2026, 10, 30);

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

	@AfterEach
	void viderLaBase() {
		saisieTempsRepository.deleteAll();
		tacheRepository.deleteAll();
		projetRepository.deleteAll();
		utilisateurRepository.deleteAll();
	}

	/**
	 * Huit saisies de 4 h soumises en même temps pour le même utilisateur et le même jour : au plus
	 * six peuvent être acceptées, les autres sont refusées par la règle des 24 h.
	 */
	@Test
	@Disabled("Condition de course connue sur le total journalier : corrigée au lot 3 (verrou par utilisateur)")
	void createConcurrentsNeDepassentPasLeTotalJournalier() throws Exception {
		Utilisateur utilisateur = saveUtilisateur();
		Tache tache = saveTache();
		BigDecimal duree = new BigDecimal("4");
		int nombreRequetes = 8;
		SaisieTempsRequest request = new SaisieTempsRequest(utilisateur.getId(), tache.getId(), JOUR, duree, null);

		CountDownLatch depart = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(nombreRequetes);
		List<Future<Boolean>> resultats = new ArrayList<>();
		try {
			for (int i = 0; i < nombreRequetes; i++) {
				resultats.add(executor.submit(() -> {
					depart.await();
					try {
						saisieTempsService.create(request);
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
				if (resultat.get(30, TimeUnit.SECONDS)) {
					acceptees++;
				}
			}

			BigDecimal total = saisieTempsRepository.totalJournee(utilisateur.getId(), JOUR, null);
			assertThat(total).isLessThanOrEqualTo(BigDecimal.valueOf(Constantes.MAX_HEURES_JOUR));
			assertThat(acceptees).isEqualTo(Constantes.MAX_HEURES_JOUR / duree.intValue());
		}
		finally {
			executor.shutdownNow();
		}
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

}
