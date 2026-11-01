package com.lirox.gestiontemps.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.SaisieTempsRequest;
import com.lirox.gestiontemps.dto.SaisieTempsResponse;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des saisies de temps et des règles qui les encadrent : utilisateur, tâche et projet
 * actifs, et total journalier limité à {@link Constantes#MAX_HEURES_JOUR} heures.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaisieTempsService {

	private static final BigDecimal MAX_HEURES_JOUR = BigDecimal.valueOf(Constantes.MAX_HEURES_JOUR);

	private final SaisieTempsRepository saisieTempsRepository;
	private final UtilisateurService utilisateurService;
	private final TacheService tacheService;
	private final Clock clock;

	/**
	 * Recherche les saisies, triées par jour ; chaque filtre est optionnel (null = non filtré).
	 *
	 * @param utilisateurId saisies de cet utilisateur
	 * @param tacheId       saisies sur cette tâche
	 * @param du            saisies à partir de ce jour (inclus)
	 * @param au            saisies jusqu'à ce jour (inclus)
	 * @return les saisies correspondantes
	 */
	public List<SaisieTempsResponse> search(Long utilisateurId, Long tacheId, LocalDate du, LocalDate au) {
		return saisieTempsRepository.search(utilisateurId, tacheId, du, au).stream()
				.map(SaisieTempsResponse::from).toList();
	}

	/**
	 * @param id identifiant de la saisie
	 * @return la saisie
	 * @throws ResourceNotFoundException si la saisie n'existe pas
	 */
	public SaisieTempsResponse findById(Long id) {
		return SaisieTempsResponse.from(getSaisie(id));
	}

	/**
	 * Crée une saisie après contrôle des règles métier.
	 *
	 * @param request données de la saisie ; sans jour, la saisie est datée d'aujourd'hui
	 * @return la saisie créée
	 * @throws ResourceNotFoundException si l'utilisateur ou la tâche n'existe pas
	 * @throws BusinessRuleException     si une règle métier est enfreinte
	 */
	@Transactional
	public SaisieTempsResponse create(SaisieTempsRequest request) {
		SaisieTemps saisie = new SaisieTemps();
		apply(request, saisie);
		return SaisieTempsResponse.from(saisieTempsRepository.save(saisie));
	}

	/**
	 * Modifie une saisie après contrôle des règles métier.
	 *
	 * @param id      identifiant de la saisie
	 * @param request nouvelles données ; sans jour, la date de la saisie est conservée
	 * @return la saisie modifiée
	 * @throws ResourceNotFoundException si la saisie, l'utilisateur ou la tâche n'existe pas
	 * @throws BusinessRuleException     si une règle métier est enfreinte
	 */
	@Transactional
	public SaisieTempsResponse update(Long id, SaisieTempsRequest request) {
		SaisieTemps saisie = getSaisie(id);
		apply(request, saisie);
		return SaisieTempsResponse.from(saisie);
	}

	/**
	 * @param id identifiant de la saisie à supprimer
	 * @throws ResourceNotFoundException si la saisie n'existe pas
	 */
	@Transactional
	public void delete(Long id) {
		saisieTempsRepository.delete(getSaisie(id));
	}

	private SaisieTemps getSaisie(Long id) {
		return saisieTempsRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Saisie de temps", id));
	}

	/**
	 * Les contrôles d'activité ne portent que sur une nouvelle affectation (création, ou changement
	 * d'utilisateur/de tâche) : une saisie existante reste corrigeable après une désactivation.
	 */
	private void apply(SaisieTempsRequest request, SaisieTemps saisie) {
		Utilisateur utilisateur = utilisateurService.getUtilisateur(request.utilisateurId());
		boolean utilisateurChange = saisie.getUtilisateur() == null
				|| !saisie.getUtilisateur().getId().equals(utilisateur.getId());
		if (utilisateurChange && !utilisateur.isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps pour un utilisateur désactivé");
		}
		Tache tache = tacheService.getTache(request.tacheId());
		boolean tacheChange = saisie.getTache() == null || !saisie.getTache().getId().equals(tache.getId());
		if (tacheChange && !tache.isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps sur une tâche désactivée");
		}
		if (tacheChange && !tache.getProjet().isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps sur une tâche d'un projet désactivé");
		}
		LocalDate jour = resoudreJour(request, saisie);
		verifierTotalJournee(request, jour, saisie.getId());
		saisie.setUtilisateur(utilisateur);
		saisie.setTache(tache);
		saisie.setJour(jour);
		saisie.setDuree(request.duree());
		saisie.setCommentaire(request.commentaire());
	}

	/** Jour fourni, sinon date inchangée (modification) ou date du jour (création). */
	private LocalDate resoudreJour(SaisieTempsRequest request, SaisieTemps saisie) {
		if (request.jour() != null) {
			return request.jour();
		}
		return saisie.getJour() != null ? saisie.getJour() : LocalDate.now(clock);
	}

	/** Le total des saisies d'un utilisateur sur une journée ne peut pas dépasser la limite journalière. */
	private void verifierTotalJournee(SaisieTempsRequest request, LocalDate jour, Long saisieId) {
		BigDecimal dejaSaisi = saisieTempsRepository.totalJournee(request.utilisateurId(), jour, saisieId);
		BigDecimal total = dejaSaisi.add(request.duree());
		if (total.compareTo(MAX_HEURES_JOUR) > 0) {
			throw new BusinessRuleException("Le total de la journée du " + jour + " dépasserait "
					+ Constantes.MAX_HEURES_JOUR + " h (" + total.stripTrailingZeros().toPlainString() + " h, dont "
					+ dejaSaisi.stripTrailingZeros().toPlainString() + " h déjà saisies)");
		}
	}

}
