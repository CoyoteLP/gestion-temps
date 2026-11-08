package com.lirox.gestiontemps.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.JetonsDeTest;
import com.lirox.gestiontemps.common.Constantes;

/**
 * Identifiant de corrélation : repris de la requête s'il est valide, sinon généré, renvoyé dans la
 * réponse (y compris sur un refus de Spring Security) et placé dans le contexte des logs le temps
 * de la requête seulement.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(JetonsDeTest.AdministrateurParDefaut.class)
class IdentifiantCorrelationFilterTest {

	private static final String UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

	@Autowired
	private MockMvc mockMvc;

	@Test
	void unIdentifiantEstGenereSiLaRequeteNEnPortePas() throws Exception {
		mockMvc.perform(get("/api/projets"))
				.andExpect(status().isOk())
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, matchesPattern(UUID)));
	}

	@Test
	void unIdentifiantValideRecuEstRepris() throws Exception {
		mockMvc.perform(get("/api/projets").header(Constantes.EN_TETE_CORRELATION, "proxy-42.a_B"))
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, "proxy-42.a_B"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "avec espace", "ligne\nfalsifiee", "accentué", "<script>",
			"12345678901234567890123456789012345678901234567890123456789012345" })
	void unIdentifiantInvalideEstRemplace(String recu) throws Exception {
		mockMvc.perform(get("/api/projets").header(Constantes.EN_TETE_CORRELATION, recu))
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, matchesPattern(UUID)));
	}

	@Test
	void unIdentifiantDeLongueurMaximaleEstRepris() throws Exception {
		String recu = "a".repeat(64);
		mockMvc.perform(get("/api/projets").header(Constantes.EN_TETE_CORRELATION, recu))
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, recu));
	}

	@Test
	void unRefusDAuthentificationPorteAussiUnIdentifiant() throws Exception {
		mockMvc.perform(get("/api/projets").with(anonymous()))
				.andExpect(status().isUnauthorized())
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, matchesPattern(UUID)));
	}

	@Test
	void deuxRequetesOntDesIdentifiantsDifferents() throws Exception {
		String premier = mockMvc.perform(get("/api/projets")).andReturn().getResponse()
				.getHeader(Constantes.EN_TETE_CORRELATION);
		mockMvc.perform(get("/api/projets"))
				.andExpect(header().string(Constantes.EN_TETE_CORRELATION, not(premier)));
	}

	@Test
	void lIdentifiantEstDansLeContexteDesLogsPendantLaRequeteSeulement() throws Exception {
		MockHttpServletRequest requete = new MockHttpServletRequest();
		requete.addHeader(Constantes.EN_TETE_CORRELATION, "requete-1");
		AtomicReference<String> pendant = new AtomicReference<>();

		new IdentifiantCorrelationFilter().doFilter(requete, new MockHttpServletResponse(),
				(req, rep) -> pendant.set(MDC.get(Constantes.CLE_LOG_CORRELATION)));

		assertThat(pendant).hasValue("requete-1");
		assertThat(MDC.get(Constantes.CLE_LOG_CORRELATION)).isNull();
	}

}
