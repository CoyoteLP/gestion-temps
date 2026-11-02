package com.lirox.gestiontemps.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/**
 * Page d'une liste renvoyée par l'API (champ {@code data} des listes).
 *
 * @param contenu éléments de la page
 * @param page    numéro de la page, à partir de 1
 * @param taille  nombre maximal d'éléments par page
 * @param total   nombre total d'éléments, toutes pages confondues
 * @param pages   nombre total de pages
 * @param <T>     type des éléments
 */
public record PageResponse<T>(
		List<T> contenu,
		int page,
		int taille,
		long total,
		int pages) {

	/**
	 * @param page          page renvoyée par Spring Data (entités, appeler dans une transaction)
	 * @param transformation conversion d'une entité en réponse
	 * @param <E>           type des entités
	 * @param <T>           type des éléments renvoyés
	 * @return la page à renvoyer au client
	 */
	public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> transformation) {
		return new PageResponse<>(page.map(transformation).getContent(), page.getNumber() + 1, page.getSize(),
				page.getTotalElements(), page.getTotalPages());
	}

}
