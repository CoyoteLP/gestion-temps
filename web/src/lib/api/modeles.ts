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

export type Projet = Omit<
	Reponse<Schemas["ProjetResponse"], "description" | "dateDebut" | "dateFin">,
	"audit"
> & {
	audit: Audit
}
