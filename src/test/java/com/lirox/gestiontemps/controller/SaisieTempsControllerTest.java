package com.lirox.gestiontemps.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static com.lirox.gestiontemps.JetonsDeTest.collaborateur;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.domain.Cloture;
import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.ClotureRepository;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.TacheRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
class SaisieTempsControllerTest {

	/** Date du jour vue par l'application pendant ces tests (horloge fixe). */
	private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 6, 15);

	/** Instant de l'horloge fixe : minuit le jour {@link #AUJOURDHUI}, dans le fuseau de la JVM. */
	private static final Instant INSTANT_FIXE = AUJOURDHUI.atStartOfDay(ZoneId.systemDefault()).toInstant();

	@TestConfiguration
	static class HorlogeFixe {

		@Bean
		@Primary
		Clock horlogeFixe() {
			return Clock.fixed(INSTANT_FIXE, ZoneId.systemDefault());
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

	@Autowired
	private MembreProjetRepository membreProjetRepository;

	@Autowired
	private ClotureRepository clotureRepository;

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
				{"duree": 25}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("tacheId :")))
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
		mockMvc.perform(get("/api/saisies-temps").param("du", "2026-10-01").param("au", "2026-10-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(3));
		mockMvc.perform(get("/api/saisies-temps")
				.param("utilisateurId", utilisateur.getId().toString())
				.param("du", "2026-10-10")
				.param("au", "2026-10-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(1))
				.andExpect(jsonPath("$.data.contenu[0].jour").value("2026-10-15"));
	}

	// Période de recherche : mois en cours par défaut, sinon du et au ensemble, au plus un an

	@Test
	void searchSansPeriodePorteSurLeMoisEnCours() throws Exception {
		save(utilisateur, LocalDate.of(2026, 5, 31));
		save(utilisateur, LocalDate.of(2026, 6, 1));
		save(utilisateur, LocalDate.of(2026, 6, 30));
		save(utilisateur, LocalDate.of(2026, 7, 1));
		mockMvc.perform(get("/api/saisies-temps"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(2))
				.andExpect(jsonPath("$.data.contenu[0].jour").value("2026-06-01"))
				.andExpect(jsonPath("$.data.contenu[1].jour").value("2026-06-30"));
	}

	@Test
	void searchAccepteUnePeriodeDUnAnExactement() throws Exception {
		save(utilisateur, LocalDate.of(2026, 1, 1));
		save(utilisateur, LocalDate.of(2026, 12, 31));
		mockMvc.perform(get("/api/saisies-temps").param("du", "2026-01-01").param("au", "2026-12-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(2));
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"2026-06-01 |            | periodeComplete : du et au doivent être fournis ensemble (sans eux : mois en cours)",
			"           | 2026-06-30 | periodeComplete : du et au doivent être fournis ensemble (sans eux : mois en cours)",
			"2026-06-30 | 2026-06-01 | periodeOrdonnee : au doit être postérieur ou égal à du",
			"2026-01-01 | 2027-01-01 | periodeLimitee : la période ne doit pas dépasser 1 an",
			"abc        | 2026-06-30 | du : format invalide" })
	void searchRefuseUnePeriodeInvalide(String du, String au, String message) throws Exception {
		MockHttpServletRequestBuilder requete = get("/api/saisies-temps");
		if (du != null) {
			requete.param("du", du);
		}
		if (au != null) {
			requete.param("au", au);
		}
		mockMvc.perform(requete)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : " + message));
	}

	@Test
	void searchEstPagineeEtTrieeParJour() throws Exception {
		for (int jour = 25; jour >= 1; jour--) {
			save(utilisateur, LocalDate.of(2026, 6, jour), "0.5");
		}
		mockMvc.perform(get("/api/saisies-temps").param("taille", "10").param("page", "2"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(10))
				.andExpect(jsonPath("$.data.contenu[0].jour").value("2026-06-11"))
				.andExpect(jsonPath("$.data.total").value(25))
				.andExpect(jsonPath("$.data.pages").value(3));
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

	// Période du projet : jour compris entre dateDebut et dateFin (bornes incluses, nulles = ouvertes)

	@ParameterizedTest
	@ValueSource(strings = { "2026-01-01", "2026-03-15", "2026-06-30" })
	void createAccepteUnJourDansLaPeriodeDuProjet(String jour) throws Exception {
		periodeDuProjet(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30));
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "%s", "duree": 2}
				""".formatted(utilisateur.getId(), tache.getId(), jour)))
				.andExpect(status().isCreated());
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"2025-12-31 | 2026-01-01 | 2026-06-30 | du 2026-01-01 au 2026-06-30",
			"2026-07-01 | 2026-01-01 | 2026-06-30 | du 2026-01-01 au 2026-06-30",
			"2025-12-31 | 2026-01-01 |            | à partir du 2026-01-01",
			"2026-07-01 |            | 2026-06-30 | jusqu'au 2026-06-30" })
	void createRefuseUnJourHorsDeLaPeriodeDuProjet(String jour, LocalDate debut, LocalDate fin, String periode)
			throws Exception {
		periodeDuProjet(debut, fin);
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "%s", "duree": 2}
				""".formatted(utilisateur.getId(), tache.getId(), jour)))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message")
						.value("Le " + jour + " est hors de la période du projet PRJ-01 (" + periode + ")"));
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void updateRefuseDeDeplacerUneSaisieHorsDeLaPeriode() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 6, 1));
		periodeDuProjet(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-07-01", "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void updateAutoriseLaCorrectionDUneSaisieDevenueHorsPeriode() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 6, 1));
		periodeDuProjet(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 5, 31));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 5}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.duree").value(5));
	}

	// Mois clôturé : aucune saisie de ce mois ne peut être créée, modifiée, déplacée ni supprimée

	@Test
	void createRefuseUneSaisieDansUnMoisCloture() throws Exception {
		cloturer(tache.getProjet(), YearMonth.of(2026, 5));
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-05-31", "duree": 2}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message").value("Le mois 2026-05 est clôturé pour le projet PRJ-01 : "
						+ "ses saisies ne peuvent plus être créées, modifiées ni supprimées"));
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void createAccepteUnAutreMoisOuUnAutreProjet() throws Exception {
		cloturer(tache.getProjet(), YearMonth.of(2026, 5));
		Tache autreProjet = saveTache("PRJ-02");
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-06-01", "duree": 2}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated());
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "jour": "2026-05-31", "duree": 2}
				""".formatted(utilisateur.getId(), autreProjet.getId())))
				.andExpect(status().isCreated());
	}

	@Test
	void uneSaisieDUnMoisClotureNePeutNiEtreModifieeNiDeplaceeNiSupprimee() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 5, 20));
		cloturer(tache.getProjet(), YearMonth.of(2026, 5));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 5}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-06-02", "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
		mockMvc.perform(delete("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(status().isUnprocessableContent());
		assertThat(saisieTempsRepository.existsById(saisie.getId())).isTrue();
	}

	@Test
	void updateRefuseDeDeplacerUneSaisieVersUnMoisCloture() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 6, 2));
		cloturer(tache.getProjet(), YearMonth.of(2026, 5));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisie.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "jour": "2026-05-29", "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isUnprocessableContent());
	}

	@Test
	void unMoisRouvertRedevientModifiable() throws Exception {
		SaisieTemps saisie = save(utilisateur, LocalDate.of(2026, 5, 20));
		Cloture cloture = cloturer(tache.getProjet(), YearMonth.of(2026, 5));
		mockMvc.perform(delete("/api/clotures/{id}", cloture.getId()))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/saisies-temps/{id}", saisie.getId()))
				.andExpect(status().isOk());
	}

	// Audit : date (horloge fixe) et auteur (email du jeton, ou sub à défaut)

	@Test
	void laCreationEnregistreSaDateEtSonAuteur() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"utilisateurId": %d, "tacheId": %d, "duree": 2}
				""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.audit.creeLe").value(INSTANT_FIXE.toString()))
				.andExpect(jsonPath("$.data.audit.creePar").value(JetonsDeTest.SUJET_ADMIN))
				.andExpect(jsonPath("$.data.audit.modifieLe").value(INSTANT_FIXE.toString()))
				.andExpect(jsonPath("$.data.audit.modifiePar").value(JetonsDeTest.SUJET_ADMIN));
	}

	@Test
	void laModificationEnregistreSonAuteurSansToucherALaCreation() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		String id = JsonPath.read(mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "tacheId": %d, "duree": 2}
						""".formatted(collaborateur.getId(), tache.getId())))
				.andReturn().getResponse().getContentAsString(), "$.data.id").toString();
		mockMvc.perform(put("/api/saisies-temps/{id}", id)
				.with(jwt().jwt(jeton -> jeton.subject(collaborateur.getSujet()).claim("email", "cdurand@lirox.com")))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "tacheId": %d, "duree": 3}
						""".formatted(tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.audit.creePar").value(JetonsDeTest.SUJET_ADMIN))
				.andExpect(jsonPath("$.data.audit.creeLe").value(INSTANT_FIXE.toString()))
				.andExpect(jsonPath("$.data.audit.modifiePar").value("cdurand@lirox.com"));
	}

	// Droits d'accès d'un collaborateur : jeton sans rôle administrateur, compte rattaché (sujet)

	@Test
	void unCollaborateurSaisitPourLuiSansPreciserLUtilisateur() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		mockMvc.perform(post("/api/saisies-temps").with(collaborateur(collaborateur))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"tacheId": %d, "jour": "2026-10-30", "duree": 2}
						""".formatted(tache.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.utilisateurId").value(collaborateur.getId()));
	}

	@Test
	void unCollaborateurNePeutPasSaisirPourUnAutre() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		mockMvc.perform(post("/api/saisies-temps").with(collaborateur(collaborateur))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"utilisateurId": %d, "tacheId": %d, "jour": "2026-10-30", "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Vous ne pouvez saisir du temps que pour vous-même"));
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void unCollaborateurNeModifieNiNeSupprimeQueSesSaisies() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		SaisieTemps saisieDUnAutre = save(utilisateur, LocalDate.of(2026, 10, 30));
		SaisieTemps saSaisie = save(collaborateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saisieDUnAutre.getId()).with(collaborateur(collaborateur))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "tacheId": %d, "duree": 5}
						""".formatted(tache.getId())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Vous ne pouvez modifier que vos propres saisies"));
		mockMvc.perform(delete("/api/saisies-temps/{id}", saisieDUnAutre.getId()).with(collaborateur(collaborateur)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Vous ne pouvez supprimer que vos propres saisies"));
		assertThat(saisieTempsRepository.findById(saisieDUnAutre.getId())).map(SaisieTemps::getDuree)
				.contains(new BigDecimal("2.00"));

		mockMvc.perform(put("/api/saisies-temps/{id}", saSaisie.getId()).with(collaborateur(collaborateur))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "tacheId": %d, "duree": 5}
						""".formatted(tache.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.duree").value(5));
		mockMvc.perform(delete("/api/saisies-temps/{id}", saSaisie.getId()).with(collaborateur(collaborateur)))
				.andExpect(status().isOk());
		assertThat(saisieTempsRepository.existsById(saSaisie.getId())).isFalse();
	}

	@Test
	void unCollaborateurNePeutPasAttribuerSaSaisieAUnAutre() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		SaisieTemps saSaisie = save(collaborateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(put("/api/saisies-temps/{id}", saSaisie.getId()).with(collaborateur(collaborateur))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "utilisateurId": %d, "tacheId": %d, "duree": 2}
						""".formatted(utilisateur.getId(), tache.getId())))
				.andExpect(status().isForbidden());
	}

	@Test
	void unCollaborateurNeVoitQueSesSaisies() throws Exception {
		Utilisateur collaborateur = saveCollaborateur("cdurand@lirox.com");
		SaisieTemps saisieDUnAutre = save(utilisateur, LocalDate.of(2026, 10, 30));
		SaisieTemps saSaisie = save(collaborateur, LocalDate.of(2026, 10, 30));
		mockMvc.perform(get("/api/saisies-temps").param("du", "2026-10-01").param("au", "2026-10-31")
				.with(collaborateur(collaborateur)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(1))
				.andExpect(jsonPath("$.data.contenu[0].id").value(saSaisie.getId()));
		mockMvc.perform(get("/api/saisies-temps").param("utilisateurId", utilisateur.getId().toString())
				.with(collaborateur(collaborateur)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message")
						.value("Vous ne pouvez consulter que vos saisies ou celles des projets dont vous êtes membre"));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisieDUnAutre.getId()).with(collaborateur(collaborateur)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Vous n'avez pas accès à cette saisie"));
		mockMvc.perform(get("/api/saisies-temps/{id}", saSaisie.getId()).with(collaborateur(collaborateur)))
				.andExpect(status().isOk());
	}

	@Test
	void unMembreDuProjetVoitToutesLesSaisiesDuProjetEtSeulementCelles() throws Exception {
		Utilisateur membre = saveCollaborateur("cdurand@lirox.com");
		saveMembre(tache.getProjet(), membre, RoleProjet.BACKUP);
		SaisieTemps saisieDUnAutre = save(utilisateur, LocalDate.of(2026, 10, 30));
		save(membre, LocalDate.of(2026, 10, 30));
		Tache tacheHorsProjet = saveTache("PRJ-02");
		SaisieTemps saisieHorsProjet = save(utilisateur, LocalDate.of(2026, 10, 31));
		saisieHorsProjet.setTache(tacheHorsProjet);

		mockMvc.perform(get("/api/saisies-temps").param("projetId", tache.getProjet().getId().toString())
				.param("du", "2026-10-01").param("au", "2026-10-31")
				.with(collaborateur(membre)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(2));
		mockMvc.perform(get("/api/saisies-temps").param("tacheId", tache.getId().toString())
				.param("utilisateurId", utilisateur.getId().toString())
				.param("du", "2026-10-01").param("au", "2026-10-31").with(collaborateur(membre)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(1))
				.andExpect(jsonPath("$.data.contenu[0].id").value(saisieDUnAutre.getId()));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisieDUnAutre.getId()).with(collaborateur(membre)))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/saisies-temps")
				.param("projetId", tacheHorsProjet.getProjet().getId().toString())
				.param("du", "2026-10-01").param("au", "2026-10-31")
				.with(collaborateur(membre)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(0));
		mockMvc.perform(get("/api/saisies-temps/{id}", saisieHorsProjet.getId()).with(collaborateur(membre)))
				.andExpect(status().isForbidden());
	}

	@Test
	void unCompteNonRattacheNAccedePasAuxSaisies() throws Exception {
		mockMvc.perform(get("/api/saisies-temps").with(jwt().jwt(jeton -> jeton.subject("inconnu"))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message")
						.value("Aucun utilisateur ne correspond à votre compte : contactez un administrateur"));
		mockMvc.perform(post("/api/saisies-temps").with(jwt().jwt(jeton -> jeton.subject("inconnu")))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"tacheId": %d, "duree": 2}
						""".formatted(tache.getId())))
				.andExpect(status().isForbidden());
		assertThat(saisieTempsRepository.count()).isZero();
	}

	@Test
	void unAdministrateurSansUtilisateurRattacheDoitPreciserLUtilisateur() throws Exception {
		mockMvc.perform(post("/api/saisies-temps").contentType(MediaType.APPLICATION_JSON).content("""
				{"tacheId": %d, "duree": 2}
				""".formatted(tache.getId())))
				.andExpect(status().isForbidden());
		assertThat(saisieTempsRepository.count()).isZero();
	}

	private void periodeDuProjet(LocalDate debut, LocalDate fin) {
		tache.getProjet().setDateDebut(debut);
		tache.getProjet().setDateFin(fin);
	}

	private Cloture cloturer(Projet p, YearMonth mois) {
		Cloture cloture = new Cloture();
		cloture.setProjet(p);
		cloture.setMois(mois.atDay(1));
		return clotureRepository.save(cloture);
	}

	/** Utilisateur dont le compte OIDC est déjà rattaché (sujet renseigné). */
	private Utilisateur saveCollaborateur(String email) {
		Utilisateur u = saveUtilisateur(email);
		u.setSujet("sujet-" + email);
		return u;
	}

	private Tache saveTache(String codeProjet) {
		Projet p = new Projet();
		p.setCode(codeProjet);
		p.setNom("Projet " + codeProjet);
		projetRepository.save(p);
		Tache t = new Tache();
		t.setProjet(p);
		t.setLibelle("Dev");
		return tacheRepository.save(t);
	}

	private MembreProjet saveMembre(Projet p, Utilisateur u, RoleProjet role) {
		MembreProjet membre = new MembreProjet();
		membre.setProjet(p);
		membre.setUtilisateur(u);
		membre.setRole(role);
		return membreProjetRepository.save(membre);
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
