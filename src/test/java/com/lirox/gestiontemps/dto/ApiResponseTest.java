package com.lirox.gestiontemps.dto;

import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.repository.ProjetRepository;

/**
 * Vérifie que toutes les réponses, succès comme erreurs, respectent l'enveloppe { status, data, message }.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
class ApiResponseTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ProjetRepository projetRepository;

	@Test
	void succesAvecDonnees() throws Exception {
		Projet projet = new Projet();
		projet.setCode("PRJ-01");
		projet.setNom("Projet");
		projetRepository.save(projet);
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("success"))
				.andExpect(jsonPath("$.data.code").value("PRJ-01"))
				.andExpect(jsonPath("$.message").value(nullValue()));
	}

	@Test
	void succesDeSuppressionAvecMessage() throws Exception {
		Projet projet = new Projet();
		projet.setCode("PRJ-01");
		projet.setNom("Projet");
		projetRepository.save(projet);
		mockMvc.perform(delete("/api/projets/{id}", projet.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("success"))
				.andExpect(jsonPath("$.data").value(nullValue()))
				.andExpect(jsonPath("$.message").value("Projet supprimé"));
	}

	@Test
	void erreurMetier() throws Exception {
		expectError(mockMvc.perform(get("/api/projets/{id}", 9999)))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Projet introuvable (id=9999)"));
	}

	@Test
	void erreurDeValidation() throws Exception {
		expectError(mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "", "nom": ""}
				""")))
				.andExpect(status().isBadRequest())
				// le texte des contraintes dépend de la langue de la JVM : seule la structure est vérifiée
				.andExpect(jsonPath("$.message", matchesPattern("Requête invalide : code : .+ ; nom : .+")));
	}

	@Test
	void erreurJsonMalForme() throws Exception {
		expectError(mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("{ pas du json")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Corps de requête JSON invalide"));
	}

	@Test
	void erreurTypeDeParametre() throws Exception {
		expectError(mockMvc.perform(get("/api/projets/abc")))
				.andExpect(status().isBadRequest());
	}

	@Test
	void erreurMethodeNonSupportee() throws Exception {
		expectError(mockMvc.perform(patch("/api/projets/1")))
				.andExpect(status().isMethodNotAllowed());
	}

	private static ResultActions expectError(ResultActions result) throws Exception {
		return result
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.data").value(nullValue()))
				.andExpect(jsonPath("$.message").isString());
	}

}
