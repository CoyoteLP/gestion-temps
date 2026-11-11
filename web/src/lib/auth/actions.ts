"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { signIn, signOut } from "@/auth"
import { PAGE_CONNEXION } from "@/lib/constantes"

import { configurationOidc } from "./oidc"
import { cheminDeRetour } from "./redirection"
import { lireJeton } from "./session"

/**
 * Lance la connexion chez le fournisseur OIDC, puis revient sur la page demandée.
 *
 * @param formulaire champ `retour` : chemin relatif de la page demandée avant la connexion
 */
export async function seConnecter(formulaire: FormData): Promise<void> {
	await signIn("keycloak", { redirectTo: cheminDeRetour(formulaire.get("retour")) })
}

/**
 * Ferme la session locale puis la session du fournisseur OIDC (sinon une nouvelle connexion
 * serait immédiate, sans mot de passe), avec retour sur la page de connexion.
 */
export async function seDeconnecter(): Promise<void> {
	const jeton = await lireJeton()
	const retour = `${await origine()}${PAGE_CONNEXION}`
	let destination = retour
	try {
		const { end_session_endpoint } = await configurationOidc()
		if (end_session_endpoint) {
			const url = new URL(end_session_endpoint)
			url.searchParams.set("post_logout_redirect_uri", retour)
			url.searchParams.set("client_id", process.env.AUTH_KEYCLOAK_ID ?? "")
			if (jeton?.idToken) {
				url.searchParams.set("id_token_hint", jeton.idToken)
			}
			destination = url.toString()
		}
	} catch {
		// Fournisseur injoignable : la session locale est fermée quand même
	}
	await signOut({ redirect: false })
	redirect(destination)
}

async function origine(): Promise<string> {
	if (process.env.AUTH_URL) {
		return new URL(process.env.AUTH_URL).origin
	}
	const entetes = await headers()
	const protocole = entetes.get("x-forwarded-proto") ?? "http"
	const hote = entetes.get("x-forwarded-host") ?? entetes.get("host")
	return `${protocole}://${hote}`
}
