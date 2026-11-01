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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.TacheRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TacheControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Autowired
	private TacheRepository tacheRepository;

	private Projet projet;

	@BeforeEach
	void setUp() {
		projet = saveProjet("PRJ-01");
	}

	@Test
	void createRetourne201AvecLocation() throws Exception {
		mockMvc.perform(post("/api/taches").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": %d, "libelle": "Développement"}
				""".formatted(projet.getId())))
				.andExpect(status().isCreated())
				.andExpect(header().exists("Location"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.projetId").value(projet.getId()))
				.andExpect(jsonPath("$.data.actif").value(true));
	}

	@Test
	void createRefuseUneRequeteInvalide() throws Exception {
		mockMvc.perform(post("/api/taches").contentType(MediaType.APPLICATION_JSON).content("""
				{"libelle": ""}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("projetId :")))
				.andExpect(jsonPath("$.message", containsString("libelle :")));
	}

	@Test
	void createRetourne404SiProjetInconnu() throws Exception {
		mockMvc.perform(post("/api/taches").contentType(MediaType.APPLICATION_JSON).content("""
				{"projetId": 9999, "libelle": "Développement"}
				"""))
				.andExpect(status().isNotFound());
	}

	@Test
	void findAllFiltreParProjet() throws Exception {
		save(projet, "Dev");
		save(saveProjet("PRJ-02"), "Recette");
		mockMvc.perform(get("/api/taches"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));
		mockMvc.perform(get("/api/taches").param("projetId", projet.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].libelle").value("Dev"));
	}

	@Test
	void updateModifieLaTache() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON).content("""
				{"version": 0, "projetId": %d, "libelle": "Développement", "actif": false}
				""".formatted(projet.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.libelle").value("Développement"))
				.andExpect(jsonPath("$.data.actif").value(false));
	}

	@Test
	void updateIncrementeLaVersion() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "projetId": %d, "libelle": "Développement"}
						""".formatted(projet.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneVersionPerimee() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "projetId": %d, "libelle": "Développement"}
						""".formatted(projet.getId())))
				.andExpect(status().isOk());
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "projetId": %d, "libelle": "Recette"}
						""".formatted(projet.getId())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value(ModificationConcurrenteException.MESSAGE));
		mockMvc.perform(get("/api/taches/{id}", tache.getId()))
				.andExpect(jsonPath("$.data.libelle").value("Développement"))
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneRequeteSansVersion() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"projetId": %d, "libelle": "Développement"}
						""".formatted(projet.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : version : est obligatoire en modification"));
		mockMvc.perform(get("/api/taches/{id}", tache.getId()))
				.andExpect(jsonPath("$.data.version").value(0));
	}

	@Test
	void deleteSupprimeLaTache() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(delete("/api/taches/{id}", tache.getId()))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/taches/{id}", tache.getId()))
				.andExpect(status().isNotFound());
	}

	@Test
	void deleteProjetRefuseSiTachesExistantes() throws Exception {
		save(projet, "Dev");
		mockMvc.perform(delete("/api/projets/{id}", projet.getId()))
				.andExpect(status().isConflict());
	}

	@Test
	void updateRetourne404SiProjetInconnuSansModifierLaTache() throws Exception {
		Tache tache = save(projet, "Dev");
		mockMvc.perform(put("/api/taches/{id}", tache.getId()).contentType(MediaType.APPLICATION_JSON).content("""
				{"version": 0, "projetId": 9999, "libelle": "Développement"}
				"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
		mockMvc.perform(get("/api/taches/{id}", tache.getId()))
				.andExpect(jsonPath("$.data.projetId").value(projet.getId()))
				.andExpect(jsonPath("$.data.libelle").value("Dev"));
	}

	@Test
	void findUpdateEtDeleteRetournent404SiTacheInconnue() throws Exception {
		mockMvc.perform(get("/api/taches/{id}", 9999))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Tâche introuvable (id=9999)"));
		mockMvc.perform(put("/api/taches/{id}", 9999).contentType(MediaType.APPLICATION_JSON).content("""
				{"version": 0, "projetId": %d, "libelle": "Développement"}
				""".formatted(projet.getId())))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Tâche introuvable (id=9999)"));
		mockMvc.perform(delete("/api/taches/{id}", 9999))
				.andExpect(status().isNotFound());
		assertThat(tacheRepository.count()).isZero();
	}

	@ParameterizedTest
	@CsvSource({ "libelle, 100", "description, 1000" })
	void createAccepteUnChampALaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/taches").contentType(MediaType.APPLICATION_JSON)
				.content(tacheJson(champ, "x".repeat(tailleMax))))
				.andExpect(status().isCreated());
	}

	@ParameterizedTest
	@CsvSource({ "libelle, 100", "description, 1000" })
	void createRefuseUnChampDepassantLaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/taches").contentType(MediaType.APPLICATION_JSON)
				.content(tacheJson(champ, "x".repeat(tailleMax + 1))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString(champ + " :")));
		assertThat(tacheRepository.count()).isZero();
	}

	/** Corps de requête valide dont le champ texte indiqué est remplacé par la valeur donnée. */
	private String tacheJson(String champ, String valeur) {
		String libelle = "libelle".equals(champ) ? valeur : "Développement";
		String description = "description".equals(champ) ? valeur : "Description";
		return """
				{"projetId": %d, "libelle": "%s", "description": "%s"}
				""".formatted(projet.getId(), libelle, description);
	}

	private Projet saveProjet(String code) {
		Projet p = new Projet();
		p.setCode(code);
		p.setNom("Projet " + code);
		return projetRepository.save(p);
	}

	private Tache save(Projet p, String libelle) {
		Tache tache = new Tache();
		tache.setProjet(p);
		tache.setLibelle(libelle);
		return tacheRepository.save(tache);
	}

}
