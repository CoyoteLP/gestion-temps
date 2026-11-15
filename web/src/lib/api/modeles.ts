import type { components } from "./schema"

type Schemas = components["schemas"]

/**
 * Réponse de l'API à partir de son schéma OpenAPI généré (`npm run api:types`). springdoc marque
 * tous les champs des records comme facultatifs, alors que l'API les renvoie tous : ils deviennent
 * obligatoires, sauf `Nullables`, qui peuvent valoir `null`.
 */
type Reponse<T, Nullables extends keyof T = never> = {
	[K in keyof T]-?: K extends Nullables ? Exclude<T[K], undefined> | null : Exclude<T[K], undefined>
}

export type Audit = Reponse<Schemas["AuditResponse"], "modifieLe" | "modifiePar">

/** `audit` n'est renvoyé qu'aux administrateurs : `null` pour les autres. */
type AvecAudit<T> = Omit<T, "audit"> & { audit: Audit | null }

/** `monRole` : rôle de l'utilisateur connecté dans le projet, `null` s'il n'en est pas membre. */
export type Projet = AvecAudit<
	Reponse<Schemas["ProjetResponse"], "description" | "dateDebut" | "dateFin" | "monRole">
>

export type Tache = AvecAudit<Reponse<Schemas["TacheResponse"], "description">>

export type MembreProjet = AvecAudit<Reponse<Schemas["MembreProjetResponse"]>>

/** Rôle d'un membre dans un projet. */
export type RoleProjet = MembreProjet["role"]

/** Corps d'une création ou d'une modification : `version` est exigée en modification seulement. */
type Requete<T> = Omit<T, "version"> & { version?: number }

/** Champs facultatifs absents (`undefined`) : enregistrés vides par l'API. */
export type ProjetRequest = Requete<Omit<Schemas["ProjetRequest"], "periodeValide">>

export type TacheRequest = Requete<Schemas["TacheRequest"]>

export type MembreProjetRequest = Requete<Schemas["MembreProjetRequest"]>

/** Modification d'une fiche par un administrateur (`PUT /api/utilisateurs/{id}`). */
export type UtilisateurRequest = Schemas["UtilisateurRequest"]

/** Saisie de temps ; `duree` en heures (multiple de 0,5). */
export type Saisie = AvecAudit<Reponse<Schemas["SaisieTempsResponse"], "commentaire">>

/** Création ou modification d'une saisie : sans `utilisateurId`, l'API retient l'appelant. */
export type SaisieRequest = Requete<Omit<Schemas["SaisieTempsRequest"], "utilisateurId">>

/** Mois clôturé pour un projet (`mois` au format `AAAA-MM`). */
export type Cloture = AvecAudit<Reponse<Schemas["ClotureResponse"]>>

/** Fiche utilisateur ; `actif: false` = en attente de validation par un administrateur, ou désactivée. */
export type Utilisateur = AvecAudit<Reponse<Schemas["UtilisateurResponse"]>>

/** Modification de son propre profil (`PUT /api/utilisateurs/moi`). */
export type ProfilRequest = Schemas["ProfilRequest"]
