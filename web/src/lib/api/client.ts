import "server-only"

import { connection } from "next/server"

import { jetonAcces } from "@/lib/auth/session"
import { EN_TETE_CORRELATION } from "@/lib/constantes"

import { ApiError, messageParDefaut, STATUT_API_INJOIGNABLE } from "./erreurs"
import type { ApiResponse } from "./types"

/** Valeur d'un paramètre de requête ; `undefined` et `null` sont omis. */
export type ParametreRequete = string | number | boolean | undefined | null

export type OptionsRequete = {
	methode?: "GET" | "POST" | "PUT" | "DELETE"
	parametres?: Record<string, ParametreRequete>
	corps?: unknown
}

/**
 * Seul point d'accès à l'API gestion-temps, exécuté côté serveur : ajoute le jeton d'accès de
 * l'utilisateur connecté et un identifiant de corrélation (repris par l'API dans ses logs), puis
 * lit l'enveloppe `ApiResponse`.
 *
 * @param chemin  chemin de l'API, ex. `/api/projets`
 * @param options méthode, paramètres de requête, corps JSON
 * @returns le champ `data` de la réponse
 * @throws ApiError si l'API répond une erreur ou est injoignable (le message est affichable)
 */
export async function apiFetch<T>(chemin: string, options: OptionsRequete = {}): Promise<T> {
	// Un appel à l'API dépend de l'utilisateur : jamais exécuté au prérendu (Cache Components), ce
	// qui autorise aussi la génération d'un identifiant aléatoire propre à chaque requête
	await connection()
	const identifiantCorrelation = crypto.randomUUID()
	const entetes: Record<string, string> = {
		Accept: "application/json",
		Authorization: `Bearer ${await jetonAcces()}`,
		[EN_TETE_CORRELATION]: identifiantCorrelation,
	}
	if (options.corps !== undefined) {
		entetes["Content-Type"] = "application/json"
	}

	let reponse: Response
	try {
		reponse = await fetch(construireUrl(chemin, options.parametres), {
			method: options.methode ?? "GET",
			headers: entetes,
			body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
			cache: "no-store",
		})
	} catch {
		console.error(`API injoignable [${identifiantCorrelation}] ${options.methode ?? "GET"} ${chemin}`)
		throw new ApiError(
			STATUT_API_INJOIGNABLE,
			messageParDefaut(STATUT_API_INJOIGNABLE),
			identifiantCorrelation,
		)
	}

	const enveloppe = await lireEnveloppe<T>(reponse)
	if (!reponse.ok || enveloppe?.status !== "success") {
		throw new ApiError(
			reponse.status,
			enveloppe?.message || messageParDefaut(reponse.status),
			reponse.headers.get(EN_TETE_CORRELATION) ?? identifiantCorrelation,
		)
	}
	return enveloppe.data as T
}

/**
 * @param chemin      chemin de l'API
 * @param parametres  paramètres de requête (valeurs vides omises)
 * @returns l'URL complète, à partir de `API_URL`
 */
export function construireUrl(chemin: string, parametres: Record<string, ParametreRequete> = {}): string {
	const base = process.env.API_URL
	if (!base) {
		throw new Error("API_URL n'est pas défini")
	}
	const url = new URL(chemin, base)
	for (const [nom, valeur] of Object.entries(parametres)) {
		if (valeur !== undefined && valeur !== null && valeur !== "") {
			url.searchParams.set(nom, String(valeur))
		}
	}
	return url.toString()
}

/** L'enveloppe JSON de la réponse, ou null si le corps n'en est pas une (proxy, page HTML…). */
async function lireEnveloppe<T>(reponse: Response): Promise<ApiResponse<T> | null> {
	try {
		const corps: unknown = await reponse.json()
		return corps && typeof corps === "object" && "status" in corps ? (corps as ApiResponse<T>) : null
	} catch {
		return null
	}
}
