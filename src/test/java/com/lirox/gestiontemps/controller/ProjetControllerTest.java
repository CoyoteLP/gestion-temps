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

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

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
import com.lirox.gestiontemps.repository.ProjetRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProjetControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Test
	void createRetourne201AvecLocation() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Refonte site", "dateDebut": "2026-01-01", "dateFin": "2026-06-30"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(header().exists("Location"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.code").value("PRJ-01"))
				.andExpect(jsonPath("$.data.dateFin").value("2026-06-30"))
				.andExpect(jsonPath("$.data.actif").value(true));
	}

	@Test
	void createRefuseUneRequeteInvalide() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "", "nom": "X", "dateDebut": "2026-06-01", "dateFin": "2026-01-01"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("code :")))
				.andExpect(jsonPath("$.message", containsString("periodeValide :")));
	}

	@Test
	void createRefuseUnCodeEnDouble() throws Exception {
		save("PRJ-01");
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Autre"}
				"""))
				.andExpect(status().isConflict());
	}

	@Test
	void findAllEtFindById() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(get("/api/projets"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1));
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nom").value("Projet PRJ-01"));
	}

	@Test
	void findByIdRetourne404SiInconnu() throws Exception {
		mockMvc.perform(get("/api/projets/{id}", 9999))
				.andExpect(status().isNotFound());
	}

	@Test
	void updateModifieLeProjet() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Nouveau nom", "actif": false}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nom").value("Nouveau nom"))
				.andExpect(jsonPath("$.data.actif").value(false));
	}

	@Test
	void deleteSupprimeLeProjet() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(delete("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(status().isNotFound());
	}

	@Test
	void updateRefuseUnCodeDejaUtiliseParUnAutreProjet() throws Exception {
		save("PRJ-01");
		Projet projet = save("PRJ-02");
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Nouveau nom"}
				"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Un projet avec le code 'PRJ-01' existe déjà"));
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(jsonPath("$.data.code").value("PRJ-02"))
				.andExpect(jsonPath("$.data.nom").value("Projet PRJ-02"));
	}

	@Test
	void updateEtDeleteRetournent404SiInconnu() throws Exception {
		mockMvc.perform(put("/api/projets/{id}", 9999).contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Projet"}
				"""))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
		mockMvc.perform(delete("/api/projets/{id}", 9999))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
		assertThat(projetRepository.count()).isZero();
	}

	@ParameterizedTest
	@CsvSource({ "code, 20", "nom, 100", "description, 1000" })
	void createAccepteUnChampALaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON)
				.content(projetJson(champ, "x".repeat(tailleMax))))
				.andExpect(status().isCreated());
	}

	@ParameterizedTest
	@CsvSource({ "code, 20", "nom, 100", "description, 1000" })
	void createRefuseUnChampDepassantLaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON)
				.content(projetJson(champ, "x".repeat(tailleMax + 1))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString(champ + " :")));
		assertThat(projetRepository.count()).isZero();
	}

	/** Corps de requête valide dont le champ indiqué est remplacé par la valeur donnée. */
	private static String projetJson(String champ, String valeur) {
		Map<String, String> champs = new LinkedHashMap<>();
		champs.put("code", "PRJ-01");
		champs.put("nom", "Projet");
		champs.put("description", "Description");
		champs.put(champ, valeur);
		return champs.entrySet().stream()
				.map(e -> "\"" + e.getKey() + "\": \"" + e.getValue() + "\"")
				.collect(Collectors.joining(", ", "{", "}"));
	}

	private Projet save(String code) {
		Projet projet = new Projet();
		projet.setCode(code);
		projet.setNom("Projet " + code);
		return projetRepository.save(projet);
	}

}
