package com.lirox.gestiontemps.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import com.lirox.gestiontemps.common.Constantes;

/**
 * Conversion de la page demandée en {@link PageRequest} de Spring Data.
 */
class PaginationRequestTest {

	private static final Sort TRI = Sort.by("id");

	@Test
	void sansParametreRenvoieLaPremierePageDeTailleParDefaut() {
		PageRequest page = new PaginationRequest(null, null).versPageRequest(TRI);
		assertThat(page.getPageNumber()).isZero();
		assertThat(page.getPageSize()).isEqualTo(Constantes.TAILLE_PAGE_PAR_DEFAUT);
		assertThat(page.getSort()).isEqualTo(TRI);
	}

	@Test
	void numeroteLesPagesAPartirDeZero() {
		assertThat(new PaginationRequest(3, 10).versPageRequest(TRI).getPageNumber()).isEqualTo(2);
	}

	@Test
	void rameneUnePageInferieureAUnALaPremiere() {
		assertThat(new PaginationRequest(0, null).versPageRequest(TRI).getPageNumber()).isZero();
		assertThat(new PaginationRequest(Integer.MIN_VALUE, null).versPageRequest(TRI).getPageNumber()).isZero();
	}

	@Test
	void plafonneLaTailleDePage() {
		assertThat(new PaginationRequest(1, Constantes.TAILLE_PAGE_MAX + 1).versPageRequest(TRI).getPageSize())
				.isEqualTo(Constantes.TAILLE_PAGE_MAX);
	}

}
