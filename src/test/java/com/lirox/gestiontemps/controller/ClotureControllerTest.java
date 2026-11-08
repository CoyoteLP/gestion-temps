package com.lirox.gestiontemps.controller;

import static com.lirox.gestiontemps.JetonsDeTest.collaborateur;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.domain.Cloture;
import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.repository.ClotureRepository;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
class ClotureControllerTest {

	/** Date du jour vue par l'application : mai 2026 est le dernier mois terminé. */
	private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 6, 15);

	private static final YearMonth MOIS_TERMINE = YearMonth.of(2026, 5);

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
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private MembreProjetRepository membreProjetRepository;

	@Autowired
	private ClotureRepository clotureRepository;

	private Projet projet;

	@BeforeEach
	void setUp() {
		projet = saveProjet("PRJ-01", true);
	}

	@Test
	void unAdministrateurClotureUnMoisTermine() throws Exception {
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": %d, "mois": "2026-05"}
				""".formatted(projet.getId())))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", containsString("/api/clotures/")))
				.andExpect(jsonPath("$.data.projetId").value(projet.getId()))
				.andExpect(jsonPath("$.data.mois").value("2026-05"))
				.andExpect(jsonPath("$.data.audit.creePar").value(JetonsDeTest.SUJET_ADMIN));
		assertThat(clotureRepository.existsByProjetIdAndMois(projet.getId(), LocalDate.of(2026, 5, 1))).isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = { "2026-06", "2026-07", "2027-01" })
	void unMoisEnCoursOuAVenirNePeutPasEtreCloture(String mois) throws Exception {
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": %d, "mois": "%s"}
				""".formatted(projet.getId(), mois)))
				.andExpect(status().isUnprocessableContent())
				.andExpect(jsonPath("$.message")
						.value("Seul un mois terminé peut être clôturé : " + mois + " est en cours ou à venir"));
		assertThat(clotureRepository.count()).isZero();
	}

	@Test
	void unMoisDejaClotureEstRefuse() throws Exception {
		saveCloture(projet, MOIS_TERMINE);
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": %d, "mois": "2026-05"}
				""".formatted(projet.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Le mois 2026-05 est déjà clôturé pour le projet PRJ-01"));
	}

	@Test
	void unProjetInconnuRenvoie404() throws Exception {
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": 9999, "mois": "2026-05"}
				"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
	}

	@Test
	void uneRequeteInvalideRenvoie400() throws Exception {
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("mois :")))
				.andExpect(jsonPath("$.message", containsString("projetId :")));
		mockMvc.perform(post("/api/clotures").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": %d, "mois": "mai 2026"}
				""".formatted(projet.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Corps de requête JSON invalide"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "MANAGER", "BACKUP" })
	void unMembreDuProjetPeutLeCloturer(RoleProjet role) throws Exception {
		Utilisateur membre = saveUtilisateur("pmartin@lirox.com");
		saveMembre(projet, membre, role);
		mockMvc.perform(post("/api/clotures").with(collaborateur(membre)).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"projetId": %d, "mois": "2026-05"}
						""".formatted(projet.getId())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.audit.creePar").value(membre.getSujet()));
	}

	@Test
	void unCollaborateurNonMembreNePeutPasCloturer() throws Exception {
		Utilisateur collaborateur = saveUtilisateur("jdupont@lirox.com");
		saveMembre(saveProjet("PRJ-02", true), collaborateur, RoleProjet.MANAGER);
		mockMvc.perform(post("/api/clotures").with(collaborateur(collaborateur)).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"projetId": %d, "mois": "2026-05"}
						""".formatted(projet.getId())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message")
						.value("Seuls un administrateur ou un responsable du projet peuvent le clôturer"));
		assertThat(clotureRepository.count()).isZero();
	}

	@Test
	void unAdministrateurClotureTousLesProjetsActifsNonClotures() throws Exception {
		Projet deuxieme = saveProjet("PRJ-02", true);
		Projet dejaCloture = saveProjet("PRJ-03", true);
		saveCloture(dejaCloture, MOIS_TERMINE);
		Projet inactif = saveProjet("PRJ-04", false);
		mockMvc.perform(post("/api/clotures/tous-projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"mois": "2026-05"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].projetId").value(projet.getId()))
				.andExpect(jsonPath("$.data[1].projetId").value(deuxieme.getId()))
				.andExpect(jsonPath("$.message").value("2 projet(s) clôturé(s) pour 2026-05"));
		assertThat(clotureRepository.existsByProjetId(inactif.getId())).isFalse();
		assertThat(clotureRepository.count()).isEqualTo(3);
	}

	@Test
	void seulUnAdministrateurPeutCloturerTousLesProjets() throws Exception {
		Utilisateur membre = saveUtilisateur("pmartin@lirox.com");
		saveMembre(projet, membre, RoleProjet.MANAGER);
		mockMvc.perform(post("/api/clotures/tous-projets").with(collaborateur(membre))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"mois": "2026-05"}
						"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Seul un administrateur peut clôturer tous les projets"));
		mockMvc.perform(post("/api/clotures/tous-projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"mois": "2026-06"}
				"""))
				.andExpect(status().isUnprocessableContent());
		assertThat(clotureRepository.count()).isZero();
	}

	@Test
	void rechercheEtDetail() throws Exception {
		Cloture mai = saveCloture(projet, MOIS_TERMINE);
		saveCloture(projet, YearMonth.of(2026, 4));
		saveCloture(saveProjet("PRJ-02", true), MOIS_TERMINE);
		mockMvc.perform(get("/api/clotures").param("projetId", projet.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(2))
				.andExpect(jsonPath("$.data.contenu[0].mois").value("2026-05"))
				.andExpect(jsonPath("$.data.contenu[1].mois").value("2026-04"));
		mockMvc.perform(get("/api/clotures").param("mois", "2026-05"))
				.andExpect(jsonPath("$.data.contenu.length()").value(2));
		mockMvc.perform(get("/api/clotures/{id}", mai.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.mois").value("2026-05"));
		mockMvc.perform(get("/api/clotures/{id}", 9999))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Clôture introuvable (id=9999)"));
	}

	@Test
	void unCollaborateurPeutConsulterLesClotures() throws Exception {
		saveCloture(projet, MOIS_TERMINE);
		mockMvc.perform(get("/api/clotures").with(collaborateur(saveUtilisateur("jdupont@lirox.com"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(1));
	}

	@Test
	void seulUnAdministrateurPeutRouvrirUnMois() throws Exception {
		Cloture cloture = saveCloture(projet, MOIS_TERMINE);
		Utilisateur membre = saveUtilisateur("pmartin@lirox.com");
		saveMembre(projet, membre, RoleProjet.MANAGER);
		mockMvc.perform(delete("/api/clotures/{id}", cloture.getId()).with(collaborateur(membre)))
				.andExpect(status().isForbidden());
		assertThat(clotureRepository.existsById(cloture.getId())).isTrue();

		mockMvc.perform(delete("/api/clotures/{id}", cloture.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Clôture supprimée : le mois est rouvert"));
		assertThat(clotureRepository.existsById(cloture.getId())).isFalse();
	}

	@Test
	void supprimerUnProjetSansTacheRetireSesClotures() throws Exception {
		saveCloture(projet, MOIS_TERMINE);
		mockMvc.perform(delete("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk());
		assertThat(clotureRepository.count()).isZero();
	}

	private Projet saveProjet(String code, boolean actif) {
		Projet p = new Projet();
		p.setCode(code);
		p.setNom("Projet " + code);
		p.setActif(actif);
		return projetRepository.save(p);
	}

	/** Utilisateur dont le compte OIDC est déjà rattaché (sujet renseigné). */
	private Utilisateur saveUtilisateur(String email) {
		Utilisateur u = new Utilisateur();
		u.setEmail(email);
		u.setNom("Dupont");
		u.setPrenom("Jean");
		u.setSujet("sujet-" + email);
		return utilisateurRepository.save(u);
	}

	private MembreProjet saveMembre(Projet p, Utilisateur u, RoleProjet role) {
		MembreProjet membre = new MembreProjet();
		membre.setProjet(p);
		membre.setUtilisateur(u);
		membre.setRole(role);
		return membreProjetRepository.save(membre);
	}

	private Cloture saveCloture(Projet p, YearMonth mois) {
		Cloture cloture = new Cloture();
		cloture.setProjet(p);
		cloture.setMois(mois.atDay(1));
		return clotureRepository.save(cloture);
	}

}
