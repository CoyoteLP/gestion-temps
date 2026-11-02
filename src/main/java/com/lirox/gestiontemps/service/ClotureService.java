package com.lirox.gestiontemps.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Cloture;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.dto.ClotureRequest;
import com.lirox.gestiontemps.dto.ClotureResponse;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.ClotureRepository;

import lombok.RequiredArgsConstructor;

/**
 * Clôture mensuelle des projets : une fois un mois clôturé pour un projet, ses saisies de ce mois
 * ne peuvent plus être créées, modifiées ni supprimées.
 * <p>
 * Seul un mois terminé peut être clôturé, par un administrateur ou un membre du projet (MANAGER,
 * BACKUP) ; seul un administrateur peut rouvrir un mois (suppression, réservée par
 * {@code SecurityConfig}). Une clôture verrouille le projet en écriture et chaque écriture de
 * saisie le verrouille en lecture : une saisie ne peut pas s'intercaler pendant la clôture.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClotureService {

	private final ClotureRepository clotureRepository;
	private final ProjetService projetService;
	private final MembreProjetService membreProjetService;
	private final UtilisateurCourantService utilisateurCourantService;
	private final Clock clock;

	/**
	 * @param projetId filtre optionnel sur le projet
	 * @param mois     filtre optionnel sur le mois
	 * @return les clôtures correspondantes, du mois le plus récent au plus ancien
	 */
	public List<ClotureResponse> search(Long projetId, YearMonth mois) {
		LocalDate premierJour = mois == null ? null : mois.atDay(1);
		return clotureRepository.search(projetId, premierJour).stream().map(ClotureResponse::from).toList();
	}

	/**
	 * @param id identifiant de la clôture
	 * @return la clôture
	 * @throws ResourceNotFoundException si la clôture n'existe pas
	 */
	public ClotureResponse findById(Long id) {
		return ClotureResponse.from(getCloture(id));
	}

	/**
	 * Clôture un mois terminé pour un projet.
	 *
	 * @param request projet et mois
	 * @return la clôture créée
	 * @throws BusinessRuleException      si le mois n'est pas terminé
	 * @throws ResourceNotFoundException  si le projet n'existe pas
	 * @throws AccesRefuseException       si l'appelant n'est ni administrateur ni membre du projet
	 * @throws DuplicateResourceException si le mois est déjà clôturé pour ce projet
	 */
	@Transactional
	public ClotureResponse create(ClotureRequest request) {
		verifierMoisTermine(request.mois());
		Projet projet = projetService.getProjetVerrouille(request.projetId());
		if (!utilisateurCourantService.estAdmin()
				&& !membreProjetService.estMembre(projet.getId(), utilisateurCourantService.get().getId())) {
			throw new AccesRefuseException("Seuls un administrateur ou un responsable du projet peuvent le clôturer");
		}
		if (clotureRepository.existsByProjetIdAndMois(projet.getId(), request.mois().atDay(1))) {
			throw new DuplicateResourceException(
					"Le mois " + request.mois() + " est déjà clôturé pour le projet " + projet.getCode());
		}
		return ClotureResponse.from(clotureRepository.save(nouvelle(projet, request.mois())));
	}

	/**
	 * Clôture un mois terminé pour tous les projets actifs qui ne le sont pas encore.
	 *
	 * @param mois mois à clôturer
	 * @return les clôtures créées (vide si tous les projets actifs l'étaient déjà)
	 * @throws AccesRefuseException  si l'appelant n'est pas administrateur
	 * @throws BusinessRuleException si le mois n'est pas terminé
	 */
	@Transactional
	public List<ClotureResponse> cloturerTousLesProjets(YearMonth mois) {
		if (!utilisateurCourantService.estAdmin()) {
			throw new AccesRefuseException("Seul un administrateur peut clôturer tous les projets");
		}
		verifierMoisTermine(mois);
		List<Projet> projetsActifs = projetService.verrouillerProjetsActifs();
		Set<Long> dejaClotures = clotureRepository.findProjetIdsByMois(mois.atDay(1));
		List<ClotureResponse> creees = new ArrayList<>();
		for (Projet projet : projetsActifs) {
			if (!dejaClotures.contains(projet.getId())) {
				creees.add(ClotureResponse.from(clotureRepository.save(nouvelle(projet, mois))));
			}
		}
		return creees;
	}

	/**
	 * Rouvre un mois (réservé aux administrateurs par {@code SecurityConfig}).
	 *
	 * @param id identifiant de la clôture à supprimer
	 * @throws ResourceNotFoundException si la clôture n'existe pas
	 */
	@Transactional
	public void delete(Long id) {
		clotureRepository.delete(getCloture(id));
	}

	/**
	 * Réservé aux autres services du paquet : refuse une écriture de saisie dans un mois clôturé.
	 * Verrouille d'abord le projet en lecture, pour qu'une clôture ne puisse pas s'intercaler.
	 *
	 * @param projet projet de la tâche de la saisie
	 * @param jour   jour de la saisie
	 * @throws BusinessRuleException si le mois du jour est clôturé pour ce projet
	 */
	void verifierNonCloture(Projet projet, LocalDate jour) {
		projetService.verrouillerEnLecture(projet.getId());
		verifierMoisOuvert(projet, jour);
	}

	/**
	 * Variante pour une saisie modifiée : refuse si son emplacement actuel ou son nouvel emplacement
	 * est dans un mois clôturé. Les projets sont verrouillés par identifiant croissant, comme dans la
	 * clôture de tous les projets : un déplacement d'un projet à l'autre et une clôture globale
	 * simultanés ne peuvent pas s'attendre mutuellement (interblocage).
	 *
	 * @param ancienProjet  projet actuel de la saisie
	 * @param ancienJour    jour actuel de la saisie
	 * @param nouveauProjet projet de la tâche demandée
	 * @param nouveauJour   jour demandé
	 * @throws BusinessRuleException si l'un des deux mois est clôturé pour son projet
	 */
	void verifierNonCloture(Projet ancienProjet, LocalDate ancienJour, Projet nouveauProjet, LocalDate nouveauJour) {
		Stream.of(ancienProjet.getId(), nouveauProjet.getId()).distinct().sorted()
				.forEach(projetService::verrouillerEnLecture);
		verifierMoisOuvert(ancienProjet, ancienJour);
		verifierMoisOuvert(nouveauProjet, nouveauJour);
	}

	private void verifierMoisOuvert(Projet projet, LocalDate jour) {
		if (clotureRepository.existsByProjetIdAndMois(projet.getId(), jour.withDayOfMonth(1))) {
			throw new BusinessRuleException("Le mois " + YearMonth.from(jour) + " est clôturé pour le projet "
					+ projet.getCode() + " : ses saisies ne peuvent plus être créées, modifiées ni supprimées");
		}
	}

	private Cloture getCloture(Long id) {
		return clotureRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Clôture", id));
	}

	private void verifierMoisTermine(YearMonth mois) {
		if (!mois.isBefore(YearMonth.now(clock))) {
			throw new BusinessRuleException(
					"Seul un mois terminé peut être clôturé : " + mois + " est en cours ou à venir");
		}
	}

	private static Cloture nouvelle(Projet projet, YearMonth mois) {
		Cloture cloture = new Cloture();
		cloture.setProjet(projet);
		cloture.setMois(mois.atDay(1));
		return cloture;
	}

}
