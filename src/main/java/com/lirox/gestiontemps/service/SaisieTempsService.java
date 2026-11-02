package com.lirox.gestiontemps.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.common.Constantes;
import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.domain.SaisieTemps;
import com.lirox.gestiontemps.domain.Tache;
import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.SaisieTempsRequest;
import com.lirox.gestiontemps.dto.SaisieTempsResponse;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des saisies de temps et des règles qui les encadrent : utilisateur, tâche et projet
 * actifs, jour dans la période du projet, mois non clôturé, total journalier limité à
 * {@link Constantes#MAX_HEURES_JOUR} heures, et droits d'accès.
 * <p>
 * Droits : un administrateur accède à toutes les saisies ; un collaborateur crée, modifie et
 * supprime ses propres saisies, et consulte en plus celles des projets dont il est membre.
 * <p>
 * Les écritures s'exécutent en {@code READ_COMMITTED} et verrouillent l'utilisateur concerné :
 * deux écritures simultanées pour le même utilisateur s'exécutent l'une après l'autre, et le total
 * journalier de la seconde, lu après le verrou, inclut la première.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaisieTempsService {

	private static final BigDecimal MAX_HEURES_JOUR = BigDecimal.valueOf(Constantes.MAX_HEURES_JOUR);

	private final SaisieTempsRepository saisieTempsRepository;
	private final UtilisateurService utilisateurService;
	private final TacheService tacheService;
	private final MembreProjetService membreProjetService;
	private final ClotureService clotureService;
	private final UtilisateurCourantService utilisateurCourantService;
	private final Clock clock;

	/**
	 * Recherche les saisies, triées par jour ; chaque filtre est optionnel (null = non filtré).
	 * <p>
	 * Un collaborateur obtient ses propres saisies (filtre utilisateur par défaut), ou toutes celles
	 * d'un projet dont il est membre lorsqu'il filtre sur ce projet ou sur une de ses tâches.
	 *
	 * @param utilisateurId saisies de cet utilisateur
	 * @param projetId      saisies sur les tâches de ce projet
	 * @param tacheId       saisies sur cette tâche
	 * @param du            saisies à partir de ce jour (inclus)
	 * @param au            saisies jusqu'à ce jour (inclus)
	 * @return les saisies correspondantes
	 * @throws ResourceNotFoundException si la tâche filtrée n'existe pas
	 * @throws AccesRefuseException      si un collaborateur demande les saisies d'un autre utilisateur
	 *                                   hors d'un projet dont il est membre
	 */
	public List<SaisieTempsResponse> search(Long utilisateurId, Long projetId, Long tacheId, LocalDate du,
			LocalDate au) {
		Long utilisateurFiltre = utilisateurId;
		if (!utilisateurCourantService.estAdmin()) {
			Long moi = utilisateurCourantService.get().getId();
			Long projetFiltre = tacheId != null ? tacheService.getTache(tacheId).getProjet().getId() : projetId;
			boolean membreDuProjet = projetFiltre != null && membreProjetService.estMembre(projetFiltre, moi);
			if (!membreDuProjet) {
				if (utilisateurFiltre != null && !utilisateurFiltre.equals(moi)) {
					throw new AccesRefuseException(
							"Vous ne pouvez consulter que vos saisies ou celles des projets dont vous êtes membre");
				}
				utilisateurFiltre = moi;
			}
		}
		return saisieTempsRepository.search(utilisateurFiltre, projetId, tacheId, du, au).stream()
				.map(SaisieTempsResponse::from).toList();
	}

	/**
	 * @param id identifiant de la saisie
	 * @return la saisie
	 * @throws ResourceNotFoundException si la saisie n'existe pas
	 * @throws AccesRefuseException      si l'appelant n'est ni administrateur, ni l'auteur de la
	 *                                   saisie, ni membre de son projet
	 */
	public SaisieTempsResponse findById(Long id) {
		SaisieTemps saisie = getSaisie(id);
		if (!utilisateurCourantService.estAdmin()) {
			Long moi = utilisateurCourantService.get().getId();
			boolean auteur = saisie.getUtilisateur().getId().equals(moi);
			if (!auteur && !membreProjetService.estMembre(saisie.getTache().getProjet().getId(), moi)) {
				throw new AccesRefuseException("Vous n'avez pas accès à cette saisie");
			}
		}
		return SaisieTempsResponse.from(saisie);
	}

	/**
	 * Crée une saisie après contrôle des droits et des règles métier.
	 *
	 * @param request données de la saisie ; sans utilisateur, la saisie est faite pour l'appelant ;
	 *                sans jour, elle est datée d'aujourd'hui
	 * @return la saisie créée
	 * @throws ResourceNotFoundException si l'utilisateur ou la tâche n'existe pas
	 * @throws AccesRefuseException      si un collaborateur saisit pour un autre utilisateur
	 * @throws BusinessRuleException     si une règle métier est enfreinte
	 */
	@Transactional(isolation = Isolation.READ_COMMITTED)
	public SaisieTempsResponse create(SaisieTempsRequest request) {
		Utilisateur utilisateur = utilisateurService.getUtilisateurVerrouille(utilisateurCible(request));
		SaisieTemps saisie = new SaisieTemps();
		apply(request, saisie, utilisateur);
		return SaisieTempsResponse.from(saisieTempsRepository.save(saisie));
	}

	/**
	 * Modifie une saisie après contrôle des droits et des règles métier.
	 *
	 * @param id      identifiant de la saisie
	 * @param request nouvelles données ; sans jour, la date de la saisie est conservée
	 * @return la saisie modifiée
	 * @throws ResourceNotFoundException        si la saisie, l'utilisateur ou la tâche n'existe pas
	 * @throws AccesRefuseException             si un collaborateur modifie la saisie d'un autre, ou
	 *                                          l'attribue à un autre utilisateur
	 * @throws BusinessRuleException            si une règle métier est enfreinte
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional(isolation = Isolation.READ_COMMITTED)
	public SaisieTempsResponse update(Long id, SaisieTempsRequest request) {
		Utilisateur utilisateur = utilisateurService.getUtilisateurVerrouille(utilisateurCible(request));
		SaisieTemps saisie = getSaisie(id);
		verifierAuteur(saisie, "Vous ne pouvez modifier que vos propres saisies");
		VerrouOptimiste.verifier(saisie.getVersion(), request.version());
		apply(request, saisie, utilisateur);
		saisieTempsRepository.flush();
		return SaisieTempsResponse.from(saisie);
	}

	/**
	 * @param id identifiant de la saisie à supprimer
	 * @throws ResourceNotFoundException si la saisie n'existe pas
	 * @throws AccesRefuseException      si un collaborateur supprime la saisie d'un autre
	 * @throws BusinessRuleException     si le mois de la saisie est clôturé pour son projet
	 */
	@Transactional(isolation = Isolation.READ_COMMITTED)
	public void delete(Long id) {
		SaisieTemps saisie = getSaisie(id);
		verifierAuteur(saisie, "Vous ne pouvez supprimer que vos propres saisies");
		clotureService.verifierNonCloture(saisie.getTache().getProjet(), saisie.getJour());
		saisieTempsRepository.delete(saisie);
	}

	private SaisieTemps getSaisie(Long id) {
		return saisieTempsRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Saisie de temps", id));
	}

	/**
	 * Utilisateur pour lequel la saisie est écrite : celui de la requête, ou l'appelant s'il est absent.
	 * Un collaborateur ne peut écrire que pour lui-même.
	 */
	private Long utilisateurCible(SaisieTempsRequest request) {
		if (utilisateurCourantService.estAdmin() && request.utilisateurId() != null) {
			return request.utilisateurId();
		}
		Long moi = utilisateurCourantService.get().getId();
		if (request.utilisateurId() != null && !request.utilisateurId().equals(moi)) {
			throw new AccesRefuseException("Vous ne pouvez saisir du temps que pour vous-même");
		}
		return moi;
	}

	/** Hors administrateur, seule une saisie de l'appelant peut être modifiée ou supprimée. */
	private void verifierAuteur(SaisieTemps saisie, String message) {
		if (!utilisateurCourantService.estAdmin()
				&& !saisie.getUtilisateur().getId().equals(utilisateurCourantService.get().getId())) {
			throw new AccesRefuseException(message);
		}
	}

	/**
	 * Applique la requête après contrôle des règles, dans cet ordre : affectation (ressources actives),
	 * clôture (mois de départ et d'arrivée), période du projet, total journalier.
	 * {@code utilisateur} a été verrouillé par l'appelant (voir la Javadoc de la classe).
	 */
	private void apply(SaisieTempsRequest request, SaisieTemps saisie, Utilisateur utilisateur) {
		Tache tache = tacheService.getTache(request.tacheId());
		LocalDate jour = resoudreJour(request, saisie);
		verifierAffectation(saisie, utilisateur, tache);
		if (saisie.getId() == null) {
			clotureService.verifierNonCloture(tache.getProjet(), jour);
		}
		else {
			clotureService.verifierNonCloture(saisie.getTache().getProjet(), saisie.getJour(), tache.getProjet(), jour);
		}
		verifierPeriodeProjet(saisie, tache, jour);
		verifierTotalJournee(utilisateur, request.duree(), jour, saisie.getId());
		saisie.setUtilisateur(utilisateur);
		saisie.setTache(tache);
		saisie.setJour(jour);
		saisie.setDuree(request.duree());
		saisie.setCommentaire(request.commentaire());
	}

	/**
	 * Les contrôles d'activité ne portent que sur une nouvelle affectation (création, ou changement
	 * d'utilisateur/de tâche) : une saisie existante reste corrigeable après une désactivation.
	 */
	private static void verifierAffectation(SaisieTemps saisie, Utilisateur utilisateur, Tache tache) {
		boolean utilisateurChange = saisie.getUtilisateur() == null
				|| !saisie.getUtilisateur().getId().equals(utilisateur.getId());
		if (utilisateurChange && !utilisateur.isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps pour un utilisateur désactivé");
		}
		boolean tacheChange = saisie.getTache() == null || !saisie.getTache().getId().equals(tache.getId());
		if (tacheChange && !tache.isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps sur une tâche désactivée");
		}
		if (tacheChange && !tache.getProjet().isActif()) {
			throw new BusinessRuleException("Impossible de saisir du temps sur une tâche d'un projet désactivé");
		}
	}

	/**
	 * Le jour doit être compris dans la période du projet (bornes nulles = ouvertes). Comme les
	 * contrôles d'activité, la règle ne porte que sur une saisie nouvelle ou déplacée (autre jour ou
	 * autre tâche) : une saisie existante reste corrigeable si les dates du projet changent ensuite.
	 */
	private static void verifierPeriodeProjet(SaisieTemps saisie, Tache tache, LocalDate jour) {
		boolean deplacee = saisie.getId() == null || !jour.equals(saisie.getJour())
				|| !saisie.getTache().getId().equals(tache.getId());
		Projet projet = tache.getProjet();
		boolean avantDebut = projet.getDateDebut() != null && jour.isBefore(projet.getDateDebut());
		boolean apresFin = projet.getDateFin() != null && jour.isAfter(projet.getDateFin());
		if (deplacee && (avantDebut || apresFin)) {
			throw new BusinessRuleException("Le " + jour + " est hors de la période du projet " + projet.getCode()
					+ " (" + periode(projet) + ")");
		}
	}

	private static String periode(Projet projet) {
		if (projet.getDateDebut() == null) {
			return "jusqu'au " + projet.getDateFin();
		}
		if (projet.getDateFin() == null) {
			return "à partir du " + projet.getDateDebut();
		}
		return "du " + projet.getDateDebut() + " au " + projet.getDateFin();
	}

	/** Jour fourni, sinon date inchangée (modification) ou date du jour (création). */
	private LocalDate resoudreJour(SaisieTempsRequest request, SaisieTemps saisie) {
		if (request.jour() != null) {
			return request.jour();
		}
		return saisie.getJour() != null ? saisie.getJour() : LocalDate.now(clock);
	}

	/** Le total des saisies d'un utilisateur sur une journée ne peut pas dépasser la limite journalière. */
	private void verifierTotalJournee(Utilisateur utilisateur, BigDecimal duree, LocalDate jour, Long saisieId) {
		BigDecimal dejaSaisi = saisieTempsRepository.totalJournee(utilisateur.getId(), jour, saisieId);
		BigDecimal total = dejaSaisi.add(duree);
		if (total.compareTo(MAX_HEURES_JOUR) > 0) {
			throw new BusinessRuleException("Le total de la journée du " + jour + " dépasserait "
					+ Constantes.MAX_HEURES_JOUR + " h (" + total.stripTrailingZeros().toPlainString() + " h, dont "
					+ dejaSaisi.stripTrailingZeros().toPlainString() + " h déjà saisies)");
		}
	}

}
