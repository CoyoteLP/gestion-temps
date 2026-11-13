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
	/**
	 * Jeton d'accès à utiliser à la place de celui de la session, quand le cookie de la requête ne
	 * le porte pas encore : connexion en cours (`enregistrerALaConnexion`) ou jeton que la Server
	 * Action vient de renouveler (`finaliserInscription`).
	 */
	jeton?: string
}

/**
 * Seul point d'accès à l'API gestion-temps, exécuté côté serveur : ajoute le jeton d'accès de
 * l'utilisateur connecté et un identifiant de corrélation (repris par l'API dans ses logs), puis
 * lit l'enveloppe `ApiResponse`.
 *
 * @param chemin  chemin de l'API, ex. `/api/projets`
 * @param options méthode, paramètres de requête, corps JSON, jeton explicite
 * @returns le champ `data` de la réponse
 * @throws ApiError si l'API répond une erreur ou est injoignable (le message est affichable)
 */
export async function apiFetch<T>(chemin: string, options: OptionsRequete = {}): Promise<T> {
	// Avant tout : un chemin invalide n'envoie aucune requête, ni le jeton
	const url = construireUrl(chemin, options.parametres)
	// Un appel à l'API dépend de l'utilisateur : jamais exécuté au prérendu (Cache Components), ce
	// qui autorise aussi la génération d'un identifiant aléatoire propre à chaque requête
	await connection()
	const identifiantCorrelation = crypto.randomUUID()
	const entetes: Record<string, string> = {
		Accept: "application/json",
		Authorization: `Bearer ${options.jeton ?? (await jetonAcces())}`,
		[EN_TETE_CORRELATION]: identifiantCorrelation,
	}
	if (options.corps !== undefined) {
		entetes["Content-Type"] = "application/json"
	}

	let reponse: Response
	try {
		reponse = await fetch(url, {
			method: options.methode ?? "GET",
			headers: entetes,
			body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
			cache: "no-store",
		})
	} catch {
		// Chemin déjà validé ; les retours à la ligne sont retirés par principe (injection dans les journaux)
		const cheminJournal = chemin.replace(/[\r\n]/g, "")
		console.error(
			`API injoignable [${identifiantCorrelation}] ${options.methode ?? "GET"} ${cheminJournal}`,
		)
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
 * Chemin d'API accepté : `/api` suivi de segments simples (lettres, chiffres, `-`, `_`, `~`, `%`).
 * Les chemins contiennent des identifiants venus du navigateur (arguments de Server Action, adresse
 * de la page) : ni hôte (`//…`), ni schéma, ni `..`, ni retour à la ligne ne doivent pouvoir y entrer.
 */
const FORMAT_CHEMIN_API = /^\/api(\/[\w~%-]+)+$/

/**
 * @param chemin      chemin de l'API, ex. `/api/projets/12`
 * @param parametres  paramètres de requête (valeurs vides omises)
 * @returns l'URL complète, sur l'hôte de `API_URL`
 * @throws Error si `API_URL` n'est pas défini, ou si le chemin n'est pas un chemin d'API simple
 *         (l'appel est alors refusé : jamais de requête vers un autre hôte avec le jeton)
 */
export function construireUrl(chemin: string, parametres: Record<string, ParametreRequete> = {}): string {
	const base = process.env.API_URL
	if (!base) {
		throw new Error("API_URL n'est pas défini")
	}
	if (!FORMAT_CHEMIN_API.test(chemin)) {
		throw new Error("Chemin d'API invalide")
	}
	// Le chemin est ajouté à la base (et non résolu contre elle) : l'hôte reste celui d'API_URL
	const origine = new URL(base).origin
	const url = new URL(`${origine}${chemin}`)
	if (url.origin !== origine) {
		throw new Error("Chemin d'API invalide")
	}
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
