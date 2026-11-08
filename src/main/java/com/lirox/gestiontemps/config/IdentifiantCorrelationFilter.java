package com.lirox.gestiontemps.config;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.lirox.gestiontemps.common.Constantes;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Identifiant de corrélation de chaque requête, placé dans le contexte des logs
 * ({@link Constantes#CLE_LOG_CORRELATION}) pour relier toutes les lignes écrites pendant son
 * traitement, et renvoyé dans l'en-tête {@link Constantes#EN_TETE_CORRELATION} de la réponse.
 * <p>
 * L'identifiant reçu dans cet en-tête (posé par un reverse proxy ou un client) est repris s'il
 * respecte {@link Constantes#FORMAT_IDENTIFIANT_CORRELATION} ; sinon un nouvel identifiant est
 * généré. Placé avant Spring Security, pour que les refus 401 et 403 en portent un aussi.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IdentifiantCorrelationFilter extends OncePerRequestFilter {

	private static final Pattern FORMAT = Pattern.compile(Constantes.FORMAT_IDENTIFIANT_CORRELATION);

	/**
	 * @param request  requête reçue
	 * @param response réponse, qui reçoit l'en-tête de corrélation
	 * @param chaine   suite des filtres
	 * @throws ServletException si un filtre suivant échoue
	 * @throws IOException      si un filtre suivant échoue en entrée-sortie
	 */
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chaine)
			throws ServletException, IOException {
		String identifiant = identifiant(request.getHeader(Constantes.EN_TETE_CORRELATION));
		response.setHeader(Constantes.EN_TETE_CORRELATION, identifiant);
		try (MDC.MDCCloseable contexte = MDC.putCloseable(Constantes.CLE_LOG_CORRELATION, identifiant)) {
			chaine.doFilter(request, response);
		}
	}

	/** L'identifiant reçu s'il est valide, sinon un nouvel identifiant aléatoire. */
	static String identifiant(String recu) {
		return recu != null && FORMAT.matcher(recu).matches() ? recu : UUID.randomUUID().toString();
	}

}
