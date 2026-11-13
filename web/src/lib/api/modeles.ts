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

export type Projet = AvecAudit<Reponse<Schemas["ProjetResponse"], "description" | "dateDebut" | "dateFin">>

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

/** Fiche utilisateur ; `actif: false` = en attente de validation par un administrateur, ou désactivée. */
export type Utilisateur = AvecAudit<Reponse<Schemas["UtilisateurResponse"]>>

/** Modification de son propre profil (`PUT /api/utilisateurs/moi`). */
export type ProfilRequest = Schemas["ProfilRequest"]
