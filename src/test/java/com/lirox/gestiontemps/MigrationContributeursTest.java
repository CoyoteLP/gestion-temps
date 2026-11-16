package com.lirox.gestiontemps;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.math.BigDecimal;
import java.time.LocalDate;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

import jakarta.persistence.EntityManager;

/**
 * Migration {@code V6__contributeurs_des_saisies_existantes.sql} : rejouée sur des données préparées
 * (Flyway l'a déjà appliquée à une base vide au démarrage), dans la transaction du test.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MigrationContributeursTest {

	private static final String SCRIPT = "db/migration/V6__contributeurs_des_saisies_existantes.sql";

	@Autowired
	private DataSource dataSource;

	@Autowired
	private EntityManager entityManager;

	@Autowired
	private ProjetRepository projetRepository;

	@Autowired
	private TacheRepository tacheRepository;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private SaisieTempsRepository saisieTempsRepository;

	@Autowired
	private MembreProjetRepository membreProjetRepository;

	@Test
	void lesAuteursDeSaisiesDeviennentContributeursDeLeursProjetsSansToucherAuxMembresExistants() {
		Tache tacheP1 = saveTache("PRJ-01");
		Tache tacheP2 = saveTache("PRJ-02");
		Utilisateur auteur = saveUtilisateur("auteur@lirox.com");
		Utilisateur responsable = saveUtilisateur("responsable@lirox.com");
		Utilisateur sansSaisie = saveUtilisateur("sans-saisie@lirox.com");
		saveSaisie(auteur, tacheP1, 1);
		saveSaisie(auteur, tacheP1, 2);
		saveSaisie(auteur, tacheP2, 3);
		saveSaisie(responsable, tacheP1, 1);
		saveMembre(tacheP1.getProjet(), responsable, RoleProjet.MANAGER);
		entityManager.flush();

		new ResourceDatabasePopulator(new ClassPathResource(SCRIPT)).execute(dataSource);
		entityManager.clear();

		assertThat(membreProjetRepository.findAll())
				.extracting(m -> m.getProjet().getCode(), m -> m.getUtilisateur().getEmail(), MembreProjet::getRole,
						MembreProjet::getCreePar)
				.containsExactlyInAnyOrder(
						tuple("PRJ-01", "auteur@lirox.com", RoleProjet.CONTRIBUTEUR, "migration V6"),
						tuple("PRJ-02", "auteur@lirox.com", RoleProjet.CONTRIBUTEUR, "migration V6"),
						tuple("PRJ-01", "responsable@lirox.com", RoleProjet.MANAGER, null));
		assertThat(membreProjetRepository.findAll())
				.noneMatch(m -> m.getUtilisateur().getId().equals(sansSaisie.getId()));
	}

	@Test
	void rejoueeSansNouvelleSaisieLaMigrationNAjouteRien() {
		Tache tache = saveTache("PRJ-01");
		saveSaisie(saveUtilisateur("auteur@lirox.com"), tache, 1);
		entityManager.flush();
		ResourceDatabasePopulator migration = new ResourceDatabasePopulator(new ClassPathResource(SCRIPT));

		migration.execute(dataSource);
		migration.execute(dataSource);

		assertThat(membreProjetRepository.count()).isEqualTo(1);
	}

	private Tache saveTache(String codeProjet) {
		Projet projet = new Projet();
		projet.setCode(codeProjet);
		projet.setNom("Projet " + codeProjet);
		projetRepository.save(projet);
		Tache tache = new Tache();
		tache.setProjet(projet);
		tache.setLibelle("Dev");
		return tacheRepository.save(tache);
	}

	private Utilisateur saveUtilisateur(String email) {
		Utilisateur utilisateur = new Utilisateur();
		utilisateur.setEmail(email);
		utilisateur.setNom("Dupont");
		utilisateur.setPrenom("Jean");
		return utilisateurRepository.save(utilisateur);
	}

	private void saveSaisie(Utilisateur utilisateur, Tache tache, int jour) {
		SaisieTemps saisie = new SaisieTemps();
		saisie.setUtilisateur(utilisateur);
		saisie.setTache(tache);
		saisie.setJour(LocalDate.of(2026, 5, jour));
		saisie.setDuree(BigDecimal.ONE);
		saisieTempsRepository.save(saisie);
	}

	private void saveMembre(Projet projet, Utilisateur utilisateur, RoleProjet role) {
		MembreProjet membre = new MembreProjet();
		membre.setProjet(projet);
		membre.setUtilisateur(utilisateur);
		membre.setRole(role);
		membreProjetRepository.save(membre);
	}

}
