package com.lirox.gestiontemps.dto;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;

/**
 * Colonnes de tri des membres d'un projet ({@code GET /api/projets/{id}/membres?tri=}).
 */
public enum TriMembre implements ColonneTri {

	/** Nom de l'utilisateur, puis prénom. */
	NOM("nom") {
		@Override
		public Sort versSort(Sort.Direction direction) {
			return ColonneTri.trierPar(direction, "utilisateur.nom", "utilisateur.prenom");
		}
	},

	/** Email de l'utilisateur. */
	EMAIL("email") {
		@Override
		public Sort versSort(Sort.Direction direction) {
			return ColonneTri.trierPar(direction, "utilisateur.email");
		}
	},

	/**
	 * Rôle, par importance (responsable, suppléant, contributeur) et non par ordre alphabétique des
	 * codes. Expression constante, sans aucune donnée du client (alias {@code m} de la requête
	 * {@code MembreProjetRepository.search}).
	 */
	ROLE("role") {
		@Override
		public Sort versSort(Sort.Direction direction) {
			// Sous forme de fonction (coalesce, sans effet ici), Spring Data laisse l'expression intacte ;
			// sinon il la préfixe par l'alias (« m.case … »)
			return JpaSort.unsafe(direction, "coalesce(case m.role"
					+ " when com.lirox.gestiontemps.domain.RoleProjet.MANAGER then 0"
					+ " when com.lirox.gestiontemps.domain.RoleProjet.BACKUP then 1 else 2 end, 2)");
		}
	};

	private final String valeur;

	TriMembre(String valeur) {
		this.valeur = valeur;
	}

	@Override
	public String valeur() {
		return valeur;
	}

}
