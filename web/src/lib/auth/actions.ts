"use server"

import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import * as client from "openid-client"

import { CHEMIN_RAPPEL_OIDC, PAGE_CONNEXION, PROMPT_INSCRIPTION } from "@/lib/constantes"

import { type DonneesConnexion, type DonneesSession, optionsConnexion, optionsSession } from "./cookies"
import { CODES_ERREUR_CONNEXION } from "./erreurs-connexion"
import { configurationOidc } from "./oidc"
import { origineApplication } from "./origine"
import { cheminDeRetour } from "./redirection"

/**
 * Lance la connexion chez le fournisseur OIDC, puis revient sur la page demandée.
 *
 * @param formulaire champ `retour` : chemin relatif de la page demandée avant la connexion
 */
export async function seConnecter(formulaire: FormData): Promise<void> {
	await demarrerConnexion(formulaire.get("retour"), {})
}

/**
 * Ouvre directement le formulaire d'inscription du fournisseur OIDC (`prompt=create`) ; une fois
 * le compte créé, l'utilisateur revient connecté sur la page demandée.
 *
 * @param formulaire champ `retour` : chemin relatif de la page demandée avant l'inscription
 */
export async function sInscrire(formulaire: FormData): Promise<void> {
	await demarrerConnexion(formulaire.get("retour"), { prompt: PROMPT_INSCRIPTION })
}

/**
 * Authorization Code + PKCE : le vérificateur, le `state`, le `nonce` et la page de retour sont
 * gardés dans un cookie chiffré de courte durée, relu au retour du fournisseur.
 */
async function demarrerConnexion(retour: unknown, parametres: Record<string, string>): Promise<void> {
	let destination: URL
	try {
		const configuration = await configurationOidc()
		const verificateur = client.randomPKCECodeVerifier()
		const connexion: DonneesConnexion = {
			verificateur,
			etat: client.randomState(),
			nonce: client.randomNonce(),
			retour: cheminDeRetour(retour),
		}
		destination = client.buildAuthorizationUrl(configuration, {
			redirect_uri: `${await origineApplication()}${CHEMIN_RAPPEL_OIDC}`,
			scope: "openid profile email",
			code_challenge: await client.calculatePKCECodeChallenge(verificateur),
			code_challenge_method: "S256",
			state: connexion.etat,
			nonce: connexion.nonce,
			...parametres,
		})
		const cookie = await getIronSession<DonneesConnexion>(await cookies(), optionsConnexion())
		Object.assign(cookie, connexion)
		await cookie.save()
	} catch (erreur) {
		console.warn("Connexion impossible à démarrer :", erreur instanceof Error ? erreur.name : "inconnue")
		redirect(`${PAGE_CONNEXION}?erreur=${CODES_ERREUR_CONNEXION.fournisseur}`)
	}
	redirect(destination.toString())
}

/**
 * Ferme la session locale puis la session du fournisseur OIDC (sinon une nouvelle connexion
 * serait immédiate, sans mot de passe), avec retour sur la page de connexion.
 */
export async function seDeconnecter(): Promise<void> {
	const session = await getIronSession<DonneesSession>(await cookies(), optionsSession())
	const idToken = session.idToken
	session.destroy()
	const retour = `${await origineApplication()}${PAGE_CONNEXION}`
	let destination = retour
	try {
		const parametres: Record<string, string> = { post_logout_redirect_uri: retour }
		if (idToken) {
			parametres.id_token_hint = idToken
		}
		destination = client.buildEndSessionUrl(await configurationOidc(), parametres).toString()
	} catch {
		// Fournisseur injoignable ou sans déconnexion : la session locale est fermée quand même
	}
	redirect(destination)
}
