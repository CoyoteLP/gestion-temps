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

import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.repository.UtilisateurRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UtilisateurControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UtilisateurRepository utilisateurRepository;

	@Test
	void createRetourne201AvecLocation() throws Exception {
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "jdupont@lirox.com", "nom": "Dupont", "prenom": "Jean"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(header().exists("Location"))
				.andExpect(jsonPath("$.data.id").isNumber())
				.andExpect(jsonPath("$.data.email").value("jdupont@lirox.com"))
				.andExpect(jsonPath("$.data.actif").value(true));
	}

	@Test
	void createRefuseUneRequeteInvalide() throws Exception {
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "pas-un-email", "nom": "", "prenom": "Jean"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("email :")))
				.andExpect(jsonPath("$.message", containsString("nom :")));
	}

	@Test
	void createRefuseUnEmailEnDouble() throws Exception {
		save("jdupont@lirox.com");
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "jdupont@lirox.com", "nom": "Autre", "prenom": "Jean"}
				"""))
				.andExpect(status().isConflict());
	}

	@Test
	void findAllEtFindById() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(get("/api/utilisateurs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1));
		mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nom").value("Dupont"));
	}

	@Test
	void updateModifieLUtilisateur() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "email": "jdupont@lirox.com", "nom": "Durand", "prenom": "Jean", "actif": false}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.nom").value("Durand"))
				.andExpect(jsonPath("$.data.actif").value(false));
	}

	@Test
	void updateIncrementeLaVersion() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "email": "jdupont@lirox.com", "nom": "Durand", "prenom": "Jean"}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneVersionPerimee() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "email": "jdupont@lirox.com", "nom": "Durand", "prenom": "Jean"}
						"""))
				.andExpect(status().isOk());
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "email": "jdupont@lirox.com", "nom": "Martin", "prenom": "Jean"}
						"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value(ModificationConcurrenteException.MESSAGE));
		mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(jsonPath("$.data.nom").value("Durand"))
				.andExpect(jsonPath("$.data.version").value(1));
	}

	@Test
	void updateRefuseUneRequeteSansVersion() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "jdupont@lirox.com", "nom": "Durand", "prenom": "Jean"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Requête invalide : version : est obligatoire en modification"));
		mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(jsonPath("$.data.version").value(0));
	}

	@Test
	void deleteSupprimeLUtilisateur() throws Exception {
		Utilisateur utilisateur = save("jdupont@lirox.com");
		mockMvc.perform(delete("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(status().isNotFound());
	}

	@Test
	void updateRefuseUnEmailDejaUtiliseParUnAutreUtilisateur() throws Exception {
		save("jdupont@lirox.com");
		Utilisateur utilisateur = save("pmartin@lirox.com");
		mockMvc.perform(put("/api/utilisateurs/{id}", utilisateur.getId()).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"version": 0, "email": "jdupont@lirox.com", "nom": "Martin", "prenom": "Paul"}
						"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Un utilisateur avec l'email 'jdupont@lirox.com' existe déjà"));
		mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
				.andExpect(jsonPath("$.data.email").value("pmartin@lirox.com"));
	}

	@Test
	void findUpdateEtDeleteRetournent404SiInconnu() throws Exception {
		mockMvc.perform(get("/api/utilisateurs/{id}", 9999))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Utilisateur introuvable (id=9999)"));
		mockMvc.perform(put("/api/utilisateurs/{id}", 9999).contentType(MediaType.APPLICATION_JSON).content("""
				{"version": 0, "email": "jdupont@lirox.com", "nom": "Dupont", "prenom": "Jean"}
				"""))
				.andExpect(status().isNotFound());
		mockMvc.perform(delete("/api/utilisateurs/{id}", 9999))
				.andExpect(status().isNotFound());
		assertThat(utilisateurRepository.count()).isZero();
	}

	@ParameterizedTest
	@CsvSource({ "nom, 100", "prenom, 100" })
	void createAccepteUnChampALaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON)
				.content(utilisateurJson(champ, "x".repeat(tailleMax))))
				.andExpect(status().isCreated());
	}

	@ParameterizedTest
	@CsvSource({ "nom, 100", "prenom, 100" })
	void createRefuseUnChampDepassantLaTailleMaximale(String champ, int tailleMax) throws Exception {
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON)
				.content(utilisateurJson(champ, "x".repeat(tailleMax + 1))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString(champ + " :")));
		assertThat(utilisateurRepository.count()).isZero();
	}

	@Test
	void createAccepteUnEmailDe150Caracteres() throws Exception {
		String email = emailDeLongueur(150);
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON)
				.content(utilisateurJson("email", email)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.email").value(email));
	}

	@Test
	void createRefuseUnEmailDe151Caracteres() throws Exception {
		mockMvc.perform(post("/api/utilisateurs").contentType(MediaType.APPLICATION_JSON)
				.content(utilisateurJson("email", emailDeLongueur(151))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message", containsString("email :")));
		assertThat(utilisateurRepository.count()).isZero();
	}

	/**
	 * Adresse email syntaxiquement valide de la longueur demandée (au moins 133 caractères) :
	 * {@code @Email} limite la partie locale à 64 caractères et chaque segment du domaine à 63.
	 */
	private static String emailDeLongueur(int longueur) {
		String debut = "a".repeat(64) + "@" + "b".repeat(63) + ".";
		String fin = ".fr";
		return debut + "c".repeat(longueur - debut.length() - fin.length()) + fin;
	}

	/** Corps de requête valide dont le champ indiqué est remplacé par la valeur donnée. */
	private static String utilisateurJson(String champ, String valeur) {
		Map<String, String> champs = new LinkedHashMap<>();
		champs.put("email", "jdupont@lirox.com");
		champs.put("nom", "Dupont");
		champs.put("prenom", "Jean");
		champs.put(champ, valeur);
		return champs.entrySet().stream()
				.map(e -> "\"" + e.getKey() + "\": \"" + e.getValue() + "\"")
				.collect(Collectors.joining(", ", "{", "}"));
	}

	private Utilisateur save(String email) {
		Utilisateur utilisateur = new Utilisateur();
		utilisateur.setEmail(email);
		utilisateur.setNom("Dupont");
		utilisateur.setPrenom("Jean");
		return utilisateurRepository.save(utilisateur);
	}

}
