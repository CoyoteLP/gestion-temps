package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import com.lirox.gestiontemps.common.Constantes;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Page demandée d'une liste, lue dans les paramètres de la requête ({@code ?page=2&taille=50}).
 *
 * @param page   numéro de page, de 1 à {@value Constantes#PAGE_MAX} ; null = première page
 * @param taille nombre d'éléments par page ; null = {@value Constantes#TAILLE_PAGE_PAR_DEFAUT},
 *               ramené à {@value Constantes#TAILLE_PAGE_MAX} au-delà
 */
public record PaginationRequest(
		@Min(value = 1, message = "doit être supérieur ou égal à 1")
		@Max(value = Constantes.PAGE_MAX, message = "doit être inférieur ou égal à {value}") Integer page,
		@Min(value = 1, message = "doit être supérieur ou égal à 1") Integer taille) {

	/**
	 * @param tri ordre des éléments, imposé par le service (le client ne choisit pas le tri)
	 * @return la page correspondante pour Spring Data (numérotée à partir de 0)
	 */
	public PageRequest versPageRequest(Sort tri) {
		int numero = page == null ? 0 : page - 1;
		int nombre = taille == null ? Constantes.TAILLE_PAGE_PAR_DEFAUT : Math.min(taille, Constantes.TAILLE_PAGE_MAX);
		return PageRequest.of(numero, nombre, tri);
	}

}
