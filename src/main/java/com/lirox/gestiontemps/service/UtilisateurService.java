package com.lirox.gestiontemps.service;

import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Utilisateur;
import com.lirox.gestiontemps.dto.PageResponse;
import com.lirox.gestiontemps.dto.PaginationRequest;
import com.lirox.gestiontemps.dto.ProfilRequest;
import com.lirox.gestiontemps.dto.UtilisateurRequest;
import com.lirox.gestiontemps.dto.UtilisateurResponse;
import com.lirox.gestiontemps.exception.BusinessRuleException;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.SaisieTempsRepository;
import com.lirox.gestiontemps.repository.UtilisateurRepository;
import com.lirox.gestiontemps.service.UtilisateurCourantService.IdentiteJeton;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;

/**
 * Gestion des utilisateurs : unicité de l'email et interdiction de supprimer un utilisateur qui a
 * des saisies de temps. Chacun gère aussi sa propre fiche ({@code /moi}) : inscription à partir de
 * son jeton (fiche inactive jusqu'à sa validation par un administrateur), lecture, nom et prénom.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurService {

	private final UtilisateurRepository utilisateurRepository;
	private final SaisieTempsRepository saisieTempsRepository;
	private final MembreProjetRepository membreProjetRepository;
	private final UtilisateurCourantService utilisateurCourantService;
	private final Validator validator;

	/**
	 * @param actif      filtre facultatif sur l'état (false : comptes en attente ou désactivés)
	 * @param pagination page demandée
	 * @return une page d'utilisateurs, par identifiant croissant
	 */
	public PageResponse<UtilisateurResponse> findAll(Boolean actif, PaginationRequest pagination) {
		PageRequest page = pagination.versPageRequest(Sort.by("id"));
		Page<Utilisateur> utilisateurs = actif == null ? utilisateurRepository.findAll(page)
				: utilisateurRepository.findByActif(actif, page);
		return PageResponse.from(utilisateurs, UtilisateurResponse::from);
	}

	/**
	 * @return la fiche de l'appelant, active ou non
	 * @throws ResourceNotFoundException si l'appelant n'a pas encore de fiche
	 */
	public UtilisateurResponse findMoi() {
		return UtilisateurResponse.from(getMoi());
	}

	/**
	 * Inscription : crée la fiche de l'appelant à partir de son jeton (email vérifié, nom, prénom),
	 * rattachée à son compte et inactive jusqu'à sa validation par un administrateur.
	 *
	 * @return la fiche créée
	 * @throws DuplicateResourceException si l'appelant a déjà une fiche, ou si son email appartient
	 *                                    à une fiche rattachée à un autre compte
	 * @throws BusinessRuleException      si l'email n'est pas vérifié, ou si l'email, le nom ou le
	 *                                    prénom du jeton sont absents ou invalides
	 */
	@Transactional
	public UtilisateurResponse createMoi() {
		if (utilisateurCourantService.trouver().isPresent()) {
			throw new DuplicateResourceException("Votre compte est déjà enregistré");
		}
		IdentiteJeton identite = utilisateurCourantService.identite();
		if (identite.email() != null && !identite.emailVerifie()) {
			throw new BusinessRuleException(UtilisateurCourantService.MESSAGE_EMAIL_NON_VERIFIE);
		}
		UtilisateurRequest donnees = new UtilisateurRequest(identite.email(), sansEspaces(identite.nom()),
				sansEspaces(identite.prenom()), false, null);
		verifierIdentite(donnees);
		if (utilisateurRepository.existsByEmail(donnees.email())) {
			throw emailDejaUtilise(donnees.email());
		}
		Utilisateur utilisateur = new Utilisateur();
		apply(donnees, utilisateur);
		utilisateur.setSujet(identite.sujet());
		return UtilisateurResponse.from(utilisateurRepository.save(utilisateur));
	}

	/**
	 * Modifie le nom et le prénom de l'appelant (y compris en attente de validation).
	 *
	 * @param request nouveau nom et prénom, avec la version lue
	 * @return la fiche modifiée
	 * @throws ResourceNotFoundException        si l'appelant n'a pas encore de fiche
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public UtilisateurResponse updateMoi(ProfilRequest request) {
		Utilisateur utilisateur = getMoi();
		VerrouOptimiste.verifier(utilisateur.getVersion(), request.version());
		utilisateur.setNom(request.nom());
		utilisateur.setPrenom(request.prenom());
		utilisateurRepository.flush();
		return UtilisateurResponse.from(utilisateur);
	}

	/**
	 * @param id identifiant de l'utilisateur
	 * @return l'utilisateur
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	public UtilisateurResponse findById(Long id) {
		return UtilisateurResponse.from(getUtilisateur(id));
	}

	/**
	 * @param request données de l'utilisateur
	 * @return l'utilisateur créé
	 * @throws DuplicateResourceException si l'email est déjà utilisé
	 */
	@Transactional
	public UtilisateurResponse create(UtilisateurRequest request) {
		if (utilisateurRepository.existsByEmail(request.email())) {
			throw emailDejaUtilise(request.email());
		}
		Utilisateur utilisateur = new Utilisateur();
		apply(request, utilisateur);
		return UtilisateurResponse.from(utilisateurRepository.save(utilisateur));
	}

	/**
	 * @param id      identifiant de l'utilisateur
	 * @param request nouvelles données
	 * @return l'utilisateur modifié
	 * @throws ResourceNotFoundException  si l'utilisateur n'existe pas
	 * @throws DuplicateResourceException si l'email est déjà utilisé par un autre utilisateur
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public UtilisateurResponse update(Long id, UtilisateurRequest request) {
		Utilisateur utilisateur = getUtilisateur(id);
		VerrouOptimiste.verifier(utilisateur.getVersion(), request.version());
		if (utilisateurRepository.existsByEmailAndIdNot(request.email(), id)) {
			throw emailDejaUtilise(request.email());
		}
		apply(request, utilisateur);
		utilisateurRepository.flush();
		return UtilisateurResponse.from(utilisateur);
	}

	/**
	 * @param id identifiant de l'utilisateur à supprimer
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 * @throws ResourceInUseException    si l'utilisateur possède des saisies (le désactiver à la place) ;
	 *                                   il est retiré des projets dont il est membre
	 */
	@Transactional
	public void delete(Long id) {
		Utilisateur utilisateur = getUtilisateur(id);
		if (saisieTempsRepository.existsByUtilisateurId(id)) {
			throw new ResourceInUseException("L'utilisateur possède des saisies de temps : désactivez-le plutôt");
		}
		membreProjetRepository.deleteByUtilisateurId(id);
		utilisateurRepository.delete(utilisateur);
	}

	/**
	 * Charge l'entité ; réservé aux autres services du paquet (ex. {@link SaisieTempsService}).
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'entité utilisateur
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	Utilisateur getUtilisateur(Long id) {
		return utilisateurRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
	}

	/**
	 * Charge l'entité en la verrouillant jusqu'à la fin de la transaction en cours, pour sérialiser
	 * les écritures qui dépendent de l'ensemble de ses données (ex. total journalier des saisies).
	 *
	 * @param id identifiant de l'utilisateur
	 * @return l'entité utilisateur, verrouillée
	 * @throws ResourceNotFoundException si l'utilisateur n'existe pas
	 */
	Utilisateur getUtilisateurVerrouille(Long id) {
		return utilisateurRepository.findVerrouilleById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
	}

	private Utilisateur getMoi() {
		return utilisateurCourantService.trouver().orElseThrow(UtilisateurService::compteNonEnregistre);
	}

	/** Les informations du jeton respectent les mêmes contraintes qu'une fiche saisie par un administrateur. */
	private void verifierIdentite(UtilisateurRequest donnees) {
		String champs = validator.validate(donnees).stream()
				.map(violation -> violation.getPropertyPath().toString())
				.distinct().sorted().collect(Collectors.joining(", "));
		if (!champs.isEmpty()) {
			throw new BusinessRuleException("Informations absentes ou invalides dans votre compte de connexion : "
					+ champs + ". Complétez votre compte puis réessayez");
		}
	}

	private static String sansEspaces(String valeur) {
		return valeur == null ? null : valeur.strip();
	}

	private static ResourceNotFoundException compteNonEnregistre() {
		return new ResourceNotFoundException("Votre compte n'est pas encore enregistré");
	}

	private static void apply(UtilisateurRequest request, Utilisateur utilisateur) {
		utilisateur.setEmail(request.email());
		utilisateur.setNom(request.nom());
		utilisateur.setPrenom(request.prenom());
		utilisateur.setActif(request.actif() == null || request.actif());
	}

	private static DuplicateResourceException emailDejaUtilise(String email) {
		return new DuplicateResourceException("Un utilisateur avec l'email '" + email + "' existe déjà");
	}

}
