package com.lirox.gestiontemps.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lirox.gestiontemps.domain.Projet;
import com.lirox.gestiontemps.dto.PageResponse;
import com.lirox.gestiontemps.dto.PaginationRequest;
import com.lirox.gestiontemps.dto.ProjetRequest;
import com.lirox.gestiontemps.dto.ProjetResponse;
import com.lirox.gestiontemps.exception.AccesRefuseException;
import com.lirox.gestiontemps.exception.DuplicateResourceException;
import com.lirox.gestiontemps.exception.ModificationConcurrenteException;
import com.lirox.gestiontemps.exception.ResourceInUseException;
import com.lirox.gestiontemps.exception.ResourceNotFoundException;
import com.lirox.gestiontemps.repository.ClotureRepository;
import com.lirox.gestiontemps.repository.MembreProjetRepository;
import com.lirox.gestiontemps.repository.ProjetRepository;
import com.lirox.gestiontemps.repository.TacheRepository;

import lombok.RequiredArgsConstructor;

/**
 * Gestion des projets : unicité du code et interdiction de supprimer un projet qui a des tâches.
 * Un collaborateur ne lit que les projets dont il est membre ({@link AccesProjetService}).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjetService {

	private final ProjetRepository projetRepository;
	private final TacheRepository tacheRepository;
	private final MembreProjetRepository membreProjetRepository;
	private final ClotureRepository clotureRepository;
	private final AccesProjetService accesProjetService;

	/**
	 * @param pagination page demandée
	 * @return une page de projets, par identifiant croissant : tous pour un administrateur, ceux dont
	 *         il est membre pour un collaborateur
	 */
	public PageResponse<ProjetResponse> findAll(PaginationRequest pagination) {
		PageRequest page = pagination.versPageRequest(Sort.by("id"));
		Long utilisateurId = accesProjetService.utilisateurRestreint();
		Page<Projet> projets = utilisateurId == null ? projetRepository.findAll(page)
				: projetRepository.findDontMembre(utilisateurId, page);
		return PageResponse.from(projets, ProjetResponse::from);
	}

	/**
	 * @param id identifiant du projet
	 * @return le projet
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 * @throws AccesRefuseException      si l'appelant n'est ni administrateur ni membre du projet
	 */
	public ProjetResponse findById(Long id) {
		Projet projet = getProjet(id);
		accesProjetService.verifierAcces(projet.getId());
		return ProjetResponse.from(projet);
	}

	/**
	 * @param request données du projet
	 * @return le projet créé
	 * @throws DuplicateResourceException si le code est déjà utilisé
	 */
	@Transactional
	public ProjetResponse create(ProjetRequest request) {
		if (projetRepository.existsByCode(request.code())) {
			throw codeDejaUtilise(request.code());
		}
		Projet projet = new Projet();
		apply(request, projet);
		return ProjetResponse.from(projetRepository.save(projet));
	}

	/**
	 * @param id      identifiant du projet
	 * @param request nouvelles données
	 * @return le projet modifié
	 * @throws ResourceNotFoundException  si le projet n'existe pas
	 * @throws DuplicateResourceException si le code est déjà utilisé par un autre projet
	 * @throws ModificationConcurrenteException si la version envoyée n'est plus celle en base
	 */
	@Transactional
	public ProjetResponse update(Long id, ProjetRequest request) {
		Projet projet = getProjet(id);
		VerrouOptimiste.verifier(projet.getVersion(), request.version());
		if (projetRepository.existsByCodeAndIdNot(request.code(), id)) {
			throw codeDejaUtilise(request.code());
		}
		apply(request, projet);
		projetRepository.flush();
		return ProjetResponse.from(projet);
	}

	/**
	 * @param id identifiant du projet à supprimer
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 * @throws ResourceInUseException    si le projet possède des tâches (le désactiver à la place) ;
	 *                                   ses membres et clôtures sont retirés avec lui
	 */
	@Transactional
	public void delete(Long id) {
		Projet projet = getProjet(id);
		if (tacheRepository.existsByProjetId(id)) {
			throw new ResourceInUseException("Le projet possède des tâches : désactivez-le plutôt");
		}
		membreProjetRepository.deleteByProjetId(id);
		clotureRepository.deleteByProjetId(id);
		projetRepository.delete(projet);
	}

	/**
	 * Pose un verrou partagé sur le projet jusqu'à la fin de la transaction (écriture d'une saisie) :
	 * une clôture du projet attend la fin de la transaction.
	 *
	 * @param id identifiant du projet
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	void verrouillerEnLecture(Long id) {
		projetRepository.findPartageById(id).orElseThrow(() -> new ResourceNotFoundException("Projet", id));
	}

	/**
	 * Charge le projet en le verrouillant en écriture jusqu'à la fin de la transaction (clôture) :
	 * attend la fin des écritures de saisies en cours sur le projet.
	 *
	 * @param id identifiant du projet
	 * @return l'entité projet, verrouillée
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	Projet getProjetVerrouille(Long id) {
		return projetRepository.findVerrouilleById(id).orElseThrow(() -> new ResourceNotFoundException("Projet", id));
	}

	/**
	 * @return les projets actifs, verrouillés en écriture dans l'ordre de leurs identifiants
	 */
	List<Projet> verrouillerProjetsActifs() {
		return projetRepository.findActifsVerrouilles();
	}

	/**
	 * Charge l'entité ; réservé aux autres services du paquet (ex. {@link MembreProjetService}).
	 *
	 * @param id identifiant du projet
	 * @return l'entité projet
	 * @throws ResourceNotFoundException si le projet n'existe pas
	 */
	Projet getProjet(Long id) {
		return projetRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Projet", id));
	}

	private static void apply(ProjetRequest request, Projet projet) {
		projet.setCode(request.code());
		projet.setNom(request.nom());
		projet.setDescription(request.description());
		projet.setDateDebut(request.dateDebut());
		projet.setDateFin(request.dateFin());
		projet.setActif(request.actif() == null || request.actif());
	}

	private static DuplicateResourceException codeDejaUtilise(String code) {
		return new DuplicateResourceException("Un projet avec le code '" + code + "' existe déjà");
	}

}
