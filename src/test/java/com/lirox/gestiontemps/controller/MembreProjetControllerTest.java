package com.lirox.gestiontemps.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.domain.MembreProjet;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.RoleProjet;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
class MembreProjetControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Autowired
	private MembreProjetRepository membreProjetRepository;

	private Projet projet;

	private Utilisateur utilisateur;

	@BeforeEach
	void setUp() {
		projet = saveProjet("PRJ-01");
		utilisateur = saveUtilisateur("jdupont@lirox.com");
	}

	@Test
	void createRetourne201AvecLocation() throws Exception {
		mockMvc.perform(post("/api/projets/{projetId}/membres", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "role": "MANAGER"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", containsString("/api/projets/" + projet.getId() + "/membres/")))
				.andExpect(jsonPath("$.data.projetId").value(projet.getId()))
				.andExpect(jsonPath("$.data.utilisateurId").value(utilisateur.getId()))
				.andExpect(jsonPath("$.data.role").value("MANAGER"))
				.andExpect(jsonPath("$.data.version").value(0));
	}

	@Test
	void createRefuseUnUtilisateurDejaMembre() throws Exception {
		save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(post("/api/projets/{projetId}/membres", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "role": "BACKUP"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("L'utilisateur est déjà membre de ce projet"));
		assertThat(membreProjetRepository.count()).isEqualTo(1);
	}

	@Test
	void createRefuseUneRequeteInvalide() throws Exception {
		mockMvc.perform(post("/api/projets/{projetId}/membres", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("role :")))
				.andExpect(jsonPath("$.message", containsString("utilisateurId :")));
	}

	@Test
	void createRefuseUnRoleInconnu() throws Exception {
		mockMvc.perform(post("/api/projets/{projetId}/membres", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "role": "DIRECTEUR"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Corps de requête JSON invalide"));
	}

	@Test
	void createRetourne404SiProjetOuUtilisateurInconnu() throws Exception {
		mockMvc.perform(post("/api/projets/{projetId}/membres", 9999).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": %d, "role": "MANAGER"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
		mockMvc.perform(post("/api/projets/{projetId}/membres", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"utilisateurId": 9999, "role": "MANAGER"}
						"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Utilisateur introuvable (id=9999)"));
		assertThat(membreProjetRepository.count()).isZero();
	}

	@Test
	void findAllEtFindById() throws Exception {
		MembreProjet membre = save(projet, utilisateur, RoleProjet.MANAGER);
		save(projet, saveUtilisateur("pmartin@lirox.com"), RoleProjet.BACKUP);
		save(saveProjet("PRJ-02"), utilisateur, RoleProjet.BACKUP);
		mockMvc.perform(get("/api/projets/{projetId}/membres", projet.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(2))
				.andExpect(jsonPath("$.data.contenu[0].role").value("MANAGER"))
				.andExpect(jsonPath("$.data.contenu[1].role").value("BACKUP"));
		mockMvc.perform(get("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.utilisateurId").value(utilisateur.getId()));
	}

	@Test
	void findAllRetourne404SiProjetInconnu() throws Exception {
		mockMvc.perform(get("/api/projets/{projetId}/membres", 9999))
				.andExpect(status().isNotFound());
	}

	@Test
	void unMembreDUnAutreProjetEstIntrouvable() throws Exception {
		MembreProjet membre = save(saveProjet("PRJ-02"), utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(get("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Membre du projet introuvable (id=" + membre.getId() + ")"));
		mockMvc.perform(delete("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId()))
				.andExpect(status().isNotFound());
		assertThat(membreProjetRepository.count()).isEqualTo(1);
	}

	@Test
	void updateModifieLeRoleEtIncrementeLaVersion() throws Exception {
		MembreProjet membre = save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(put("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "utilisateurId": %d, "role": "BACKUP"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.role").value("BACKUP"))
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneVersionPerimee() throws Exception {
		MembreProjet membre = save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(put("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "utilisateurId": %d, "role": "BACKUP"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isOk());
		mockMvc.perform(put("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "utilisateurId": %d, "role": "MANAGER"}
						""".formatted(utilisateur.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value(ModificationConcurrenteException.MESSAGE));
	}

	@Test
	void updateRefuseUnUtilisateurDejaMembre() throws Exception {
		Utilisateur autre = saveUtilisateur("pmartin@lirox.com");
		save(projet, autre, RoleProjet.BACKUP);
		MembreProjet membre = save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(put("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId())
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"version": 0, "utilisateurId": %d, "role": "MANAGER"}
						""".formatted(autre.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("L'utilisateur est déjà membre de ce projet"));
	}

	@Test
	void deleteRetireLeMembre() throws Exception {
		MembreProjet membre = save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(delete("/api/projets/{projetId}/membres/{id}", projet.getId(), membre.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").doesNotExist())
				.andExpect(jsonPath("$.message").value("Membre retiré du projet"));
		assertThat(membreProjetRepository.count()).isZero();
	}

	@Test
	void supprimerUnProjetSansTacheRetireSesMembres() throws Exception {
		save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(delete("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk());
		assertThat(membreProjetRepository.count()).isZero();
		assertThat(utilisateurRepository.existsById(utilisateur.getId())).isTrue();
	}

	@Test
	void supprimerUnUtilisateurLeRetireDeSesProjets() throws Exception {
		save(projet, utilisateur, RoleProjet.MANAGER);
		mockMvc.perform(delete("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(status().isOk());
		assertThat(membreProjetRepository.count()).isZero();
		assertThat(projetRepository.existsById(projet.getId())).isTrue();
	}

	private Projet saveProjet(String code) {
		Projet p = new Projet();
		p.setCode(code);
		p.setNom("Projet " + code);
		return projetRepository.save(p);
	}

	private Utilisateur saveUtilisateur(String email) {
		Utilisateur u = new Utilisateur();
		u.setEmail(email);
		u.setNom("Dupont");
		u.setPrenom("Jean");
		return utilisateurRepository.save(u);
	}

	private MembreProjet save(Projet p, Utilisateur u, RoleProjet role) {
		MembreProjet membre = new MembreProjet();
		membre.setProjet(p);
		membre.setUtilisateur(u);
		membre.setRole(role);
		return membreProjetRepository.save(membre);
	}

}
