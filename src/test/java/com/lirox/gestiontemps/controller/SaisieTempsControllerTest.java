package com.lirox.gestiontemps.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SaisieTempsControllerTest {

	/** Date du jour vue par l'application pendant ces tests (horloge fixe). */
	private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 6, 15);

	@TestConfiguration
	static class HorlogeFixe {

		@Bean
		@Primary
		Clock horlogeFixe() {
			return Clock.fixed(AUJOURDHUI.atStartOfDay(ZoneId.systemDefault()).toInstant(), ZoneId.systemDefault());
		}

	}

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Autowired
	private TacheRepository tacheRepository;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private SaisieTempsRepository saisieTempsRepository;

	private Utilisateur utilisateur;

	private Tache tache;

	@BeforeEach
	void setUp() {
		Projet projet = new Projet();
		projet.setCode("PRJ-01");
		projet.setNom("Projet PRJ-01");
		projetRepository.save(projet);

		tache = new Tache();
		tache.setProjet(projet);
		tache.setLibelle("Dev");
		tacheRepository.save(tache);

		utilisateur = saveUtilisateur("jdupont@lirox.com");
	}

	@Test
	void createRetourne201AvecLocation() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 7.5, "commentaire": "API"}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated())
				.andExpect(header().exists("Location"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.jour").value("2026-10-30"))
				.andExpect(jsonPath("$.data.duree").value(7.5));
	}

	@Test
	void createRefuseUneRequeteInvalide() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"tacheId": %d, "duree": 25}
				""".formatted(tache.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("utilisateurId :")))
				.andExpect(jsonPath("$.message", containsString("duree :")));
	}

	@ParameterizedTest
	@ValueSource(strings = { "0.5", "1", "7.5", "23.5", "24", "24.0" })
	void createAccepteUneDureeValide(String duree) throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": %s}
				""".formatted(utilisateur.getId(), tache.getId(), duree)))
				.andExpect(status().isCreated());
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"0     | duree : doit être d'au moins 0.5 h",
			"0.25  | duree : doit être d'au moins 0.5 h",
			"-1    | duree : doit être d'au moins 0.5 h",
			"24.5  | duree : ne doit pas dépasser 24.0 h",
			"7.25  | duree : doit être un multiple de 0.5 h",
			"1.75  | duree : doit être un multiple de 0.5 h",
			"2.501 | duree : doit être un multiple de 0.5 h" })
	void createRefuseUneDureeInvalide(String duree, String messageAttendu) throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": %s}
				""".formatted(utilisateur.getId(), tache.getId(), duree)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.message", containsString(messageAttendu)));
	}

	@Test
	void createAccepteUnCommentaireDe500Caracteres() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "duree": 1, "commentaire": "%s"}
				""".formatted(utilisateur.getId(), tache.getId(), "x".repeat(500))))
				.andExpect(status().isCreated());
	}

	@Test
	void createRefuseUnCommentaireDe501Caracteres() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "duree": 1, "commentaire": "%s"}
				""".formatted(utilisateur.getId(), tache.getId(), "x".repeat(501))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("commentaire :")));
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void createRefuseUneDureeAbsente() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("duree : est obligatoire")));
	}

	@Test
	void updateRefuseUneDureeHorsPas() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 1));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 2.25}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("duree : doit être un multiple de 0.5 h")));
	}

	@Test
	void createSansJourDateLaSaisieDAujourdhui() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "duree": 3}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.jour").value(AUJOURDHUI.toString()));
	}

	@Test
	void createSansJourCompteLeTotalDAujourdhui() throws Exception {
		save(utilisateur, AUJOURDHUI, "22");
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "duree": 3}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void updateSansJourConserveLaDateDeLaSaisie() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 3, 2));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 4}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.jour").value("2026-03-02"));
	}

	@Test
	void createRetourne404SiTacheInconnue() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": 9999, "jour": "2026-10-30", "duree": 1}
				""".formatted(utilisateur.getId())))
				.andExpect(status().isNotFound());
	}

	@Test
	void createRetourne404SiUtilisateurInconnuSansRienEnregistrer() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": 9999, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
				""".formatted(tache.getId())))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.data").value(nullValue()))
				.andExpect(jsonPath("$.message").value("Utilisateur introuvable (id=9999)"));
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void createVerifieLUtilisateurAvantLaTache() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": 9999, "tacheId": 8888, "jour": "2026-10-30", "duree": 1}
				"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Utilisateur introuvable (id=9999)"));
	}

	@Test
	void updateRetourne404SiUtilisateurInconnuSansModifierLaSaisie() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 1));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": 9999, "tacheId": %d, "jour": "2026-10-02", "duree": 5}
						""".formatted(tache.getId())))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Utilisateur introuvable (id=9999)"));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(jsonPath("$.data.utilisateurId").value(utilisateur.getId()))
				.andExpect(jsonPath("$.data.jour").value("2026-10-01"))
				.andExpect(jsonPath("$.data.duree").value(2));
	}

	@Test
	void createRefuseSurUneTacheDesactivee() throws Exception {
		tache.setActif(false);
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message").value("Impossible de saisir du temps sur une tâche désactivée"));
	}

	@Test
	void createRefusePourUnUtilisateurDesactive() throws Exception {
		utilisateur.setActif(false);
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message").value("Impossible de saisir du temps pour un utilisateur désactivé"));
	}

	@Test
	void updateRefuseVersUneTacheDesactivee() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		Tache inactive = new Tache();
		inactive.setProjet(tache.getProjet());
		inactive.setLibelle("Ancienne tâche");
		inactive.setActif(false);
		tacheRepository.save(inactive);
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
						""".formatted(utilisateur.getId(), inactive.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void createRefuseSurUneTacheDUnProjetDesactive() throws Exception {
		tache.getProjet().setActif(false);
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message").value("Impossible de saisir du temps sur une tâche d'un projet désactivé"));
	}

	@Test
	void updateAutoriseLaCorrectionApresDesactivations() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		utilisateur.setActif(false);
		tache.setActif(false);
		tache.getProjet().setActif(false);
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 3, "commentaire": "Corrigé"}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.duree").value(3))
				.andExpect(jsonPath("$.data.commentaire").value("Corrigé"));
	}

	@Test
	void updateIncrementeLaVersion() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 3}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneVersionPerimee() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 3}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk());
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 6}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value(ModificationConcurrenteException.MESSAGE));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(jsonPath("$.data.duree").value(3))
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneRequeteSansVersion() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "tacheId": %d, "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : version : est obligatoire en modification"));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(jsonPath("$.data.version").value(0));
	}

	@Test
	void updateRefuseVersUnUtilisateurDesactive() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		Utilisateur inactif = saveUtilisateur("inactif@lirox.com");
		inactif.setActif(false);
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 1}
						""".formatted(inactif.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void deleteResteAutoriseSurUneTacheDesactivee() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30));
		tache.setActif(false);
		mockMvc.perform(delete("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(status().isOk());
	}

	@Test
	void createRefuseSiTotalJourneeDepasse24h() throws Exception {
		save(utilisateur, LocalDate.of(2026, 10, 30), "20");
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 4.5}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message").value(
						"Le total de la journée du 2026-10-30 dépasserait 24 h (24.5 h, dont 20 h déjà saisies)"));
	}

	@Test
	void createAccepteUnTotalJourneeDe24h() throws Exception {
		save(utilisateur, LocalDate.of(2026, 10, 30), "20");
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 4}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated());
	}

	@Test
	void totalJourneeNeCompteQueLUtilisateurEtLeJourConcernes() throws Exception {
		save(utilisateur, LocalDate.of(2026, 10, 29), "20");
		save(saveUtilisateur("autre@lirox.com"), LocalDate.of(2026, 10, 30), "20");
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 8}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated());
	}

	@Test
	void updateNeComptePasDeuxFoisLaSaisieModifiee() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30), "20");
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 22}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk());
	}

	@Test
	void updateRefuseSiTotalJourneeDepasse24h() throws Exception {
		save(utilisateur, LocalDate.of(2026, 10, 30), "20");
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 30), "2");
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 5}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void searchFiltreParUtilisateurEtPeriode() throws Exception {
		Utilisateur autre = saveUtilisateur("autre@lirox.com");
		save(utilisateur, LocalDate.of(2026, 10, 1));
		save(utilisateur, LocalDate.of(2026, 10, 15));
		save(autre, LocalDate.of(2026, 10, 15));
		mockMvc.perform(get("/api/saisies-temps"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(3));
		mockMvc.perform(get("/api/saisies-temps")
				.param("utilisateurId", utilisateur.getId().toString())
				.param("du", "2026-10-10")
				.param("au", "2026-10-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].jour").value("2026-10-15"));
	}

	@Test
	void updateModifieLaSaisie() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 1));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-10-02", "duree": 3.5}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.jour").value("2026-10-02"))
				.andExpect(jsonPath("$.data.duree").value(3.5));
	}

	@Test
	void deleteSupprimeLaSaisie() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 10, 1));
		mockMvc.perform(delete("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(status().isNotFound());
	}

	@Test
	void deleteTacheEtUtilisateurRefusesSiSaisiesExistantes() throws Exception {
		save(utilisateur, LocalDate.of(2026, 10, 1));
		mockMvc.perform(delete("/api/taches/{id}", tache.getId()))
				.andExpect(status().isConflict());
		mockMvc.perform(delete("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(status().isConflict());
	}

	private Utilisateur saveUtilisateur(String email) {
		Utilisateur u = new Utilisateur();
		u.setEmail(email);
		u.setNom("Dupont");
		u.setPrenom("Jean");
		return utilisateurRepository.save(u);
	}

	private SaisieTemps save(Utilisateur u, LocalDate jour) {
		return save(u, jour, "2.00");
	}

	private SaisieTemps save(Utilisateur u, LocalDate jour, String duree) {
		SaisieTemps saisie = new SaisieTemps();
		saisie.setUtilisateur(u);
		saisie.setTache(tache);
		saisie.setJour(jour);
		saisie.setDuree(new BigDecimal(duree));
		return saisieTempsRepository.save(saisie);
	}

}
