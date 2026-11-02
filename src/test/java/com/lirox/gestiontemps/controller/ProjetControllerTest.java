package com.lirox.gestiontemps.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.context.annotation.Import;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.ProjetRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
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
				.andExpect(jsonPath("$.data.contenu.length()").value(1));
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
				{"version": 0, "code": "PRJ-01", "nom": "Nouveau nom", "actif": false}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nom").value("Nouveau nom"))
				.andExpect(jsonPath("$.data.actif").value(false));
	}

	@Test
	void createIgnoreLaVersionEtDemarreAZero() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"version": 7, "code": "PRJ-01", "nom": "Projet"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.version").value(0));
	}

	// Pagination, commune à toutes les listes : page à partir de 1, taille 20 par défaut, 100 au plus

	@Test
	void laListeEstPagineeParVingtParDefaut() throws Exception {
		for (int i = 1; i <= 25; i++) {
			save("PRJ-%02d".formatted(i));
		}
		mockMvc.perform(get("/api/projets"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(20))
				.andExpect(jsonPath("$.data.contenu[0].code").value("PRJ-01"))
				.andExpect(jsonPath("$.data.page").value(1))
				.andExpect(jsonPath("$.data.taille").value(20))
				.andExpect(jsonPath("$.data.total").value(25))
				.andExpect(jsonPath("$.data.pages").value(2));
		mockMvc.perform(get("/api/projets").param("page", "2"))
				.andExpect(jsonPath("$.data.contenu.length()").value(5))
				.andExpect(jsonPath("$.data.contenu[0].code").value("PRJ-21"))
				.andExpect(jsonPath("$.data.page").value(2));
		mockMvc.perform(get("/api/projets").param("page", "3").param("taille", "10"))
				.andExpect(jsonPath("$.data.contenu.length()").value(5))
				.andExpect(jsonPath("$.data.pages").value(3));
	}

	@Test
	void unePageAuDelaDeLaDerniereEstVide() throws Exception {
		save("PRJ-01");
		mockMvc.perform(get("/api/projets").param("page", "5"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(0))
				.andExpect(jsonPath("$.data.total").value(1));
	}

	@Test
	void laDernierePagePossibleEstAccepteeAvecLaTailleMaximale() throws Exception {
		mockMvc.perform(get("/api/projets").param("page", String.valueOf(Constantes.PAGE_MAX))
				.param("taille", String.valueOf(Constantes.TAILLE_PAGE_MAX)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.contenu.length()").value(0))
				.andExpect(jsonPath("$.data.page").value(Constantes.PAGE_MAX));
	}

	@Test
	void uneTailleAuDelaDuMaximumEstRameneeACent() throws Exception {
		mockMvc.perform(get("/api/projets").param("taille", "500"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.taille").value(100));
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"page   | 0   | page : doit être supérieur ou égal à 1",
			"taille | 0   | taille : doit être supérieur ou égal à 1",
			"page   | abc | page : format invalide",
			"taille | -5  | taille : doit être supérieur ou égal à 1",
			"page   | 21474837 | page : doit être inférieur ou égal à 21474836" })
	void unePageOuUneTailleInvalideRenvoie400(String parametre, String valeur, String message) throws Exception {
		mockMvc.perform(get("/api/projets").param(parametre, valeur))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : " + message));
	}

	@Test
	void laReponseExposeLAuditDeLaCreation() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("""
				{"code": "PRJ-01", "nom": "Projet"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.audit.creeLe").isNotEmpty())
				.andExpect(jsonPath("$.data.audit.creePar").value(JetonsDeTest.SUJET_ADMIN))
				.andExpect(jsonPath("$.data.audit.modifiePar").value(JetonsDeTest.SUJET_ADMIN));
	}

	@Test
	void updateIncrementeLaVersion() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "code": "PRJ-01", "nom": "Première modification"}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneVersionPerimee() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "code": "PRJ-01", "nom": "Première modification"}
						"""))
				.andExpect(status().isOk());
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "code": "PRJ-01", "nom": "Modification sur une version périmée"}
						"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value(ModificationConcurrenteException.MESSAGE));
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(jsonPath("$.data.nom").value("Première modification"))
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneRequeteSansVersion() throws Exception {
		Projet projet = save("PRJ-01");
		mockMvc.perform(put("/api/projets/{id}", projet.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"code": "PRJ-01", "nom": "Nouveau nom"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : version : est obligatoire en modification"));
		mockMvc.perform(get("/api/projets/{id}", projet.getId()))
				.andExpect(jsonPath("$.data.version").value(0));
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
				{"version": 0, "code": "PRJ-01", "nom": "Nouveau nom"}
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
				{"version": 0, "code": "PRJ-01", "nom": "Projet"}
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

	// Erreurs techniques de Spring MVC : code HTTP, enveloppe ApiResponse et message en français,
	// quel que soit l'endpoint.

	@Test
	void getProjetAvecUnIdNonNumeriqueRenvoie400() throws Exception {
		mockMvc.perform(get("/api/projets/abc"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.data").doesNotExist())
				.andExpect(jsonPath("$.message").value("Paramètre invalide : 'id' n'a pas le format attendu"));
	}

	@Test
	void methodeNonSupporteeRenvoie405() throws Exception {
		mockMvc.perform(patch("/api/projets/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(header().exists("Allow"))
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.message").value("La méthode PATCH n'est pas autorisée sur cette URL"));
	}

	@Test
	void typeDeContenuNonSupporteRenvoie415() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.TEXT_PLAIN).content("PRJ-01"))
				.andExpect(status().isUnsupportedMediaType())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.message")
						.value("Type de contenu non supporté : le corps doit être envoyé en application/json"));
		assertThat(projetRepository.count()).isZero();
	}

	@Test
	void urlInconnueRenvoie404() throws Exception {
		mockMvc.perform(get("/api/inconnue"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value("error"))
				.andExpect(jsonPath("$.message").value("URL inconnue : /api/inconnue"));
	}

	@Test
	void corpsJsonMalFormeRenvoie400() throws Exception {
		mockMvc.perform(post("/api/projets").contentType(MediaType.APPLICATION_JSON).content("{\"code\": "))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Corps de requête JSON invalide"));
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
