import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"

import { estAdministrateur, expirationProche, jetonsRenouvelesDe, rafraichirJeton } from "@/lib/auth/jeton"
import { enregistrerALaConnexion } from "@/lib/compte/enregistrement"
import { PAGE_CONNEXION } from "@/lib/constantes"

/**
 * Authentification OIDC en BFF : Authorization Code + PKCE avec le fournisseur (Keycloak, client
 * public par défaut), jetons conservés dans le cookie de session chiffré `httpOnly`. Le navigateur
 * ne voit jamais les jetons : la session exposée (callback `session`) n'en contient aucun.
 * Configuration par variables d'environnement : `AUTH_SECRET`, `AUTH_KEYCLOAK_ID`,
 * `AUTH_KEYCLOAK_ISSUER`, `AUTH_KEYCLOAK_SECRET` (client confidentiel seulement).
 */
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
	providers: [
		Keycloak({
			client: {
				token_endpoint_auth_method: process.env.AUTH_KEYCLOAK_SECRET ? "client_secret_post" : "none",
			},
			checks: ["pkce", "state"],
		}),
	],
	pages: { signIn: PAGE_CONNEXION, error: PAGE_CONNEXION },
	session: { strategy: "jwt" },
	events: {
		/** Première connexion d'un inscrit : création de sa fiche (inactive) dans l'API. */
		async signIn({ account }) {
			await enregistrerALaConnexion(account?.access_token)
		},
	},
	callbacks: {
		async jwt({ token, account, trigger, session }) {
			if (trigger === "update") {
				// Renouvellement forcé par une Server Action (jetonAccesRenouvele) : jetons à enregistrer
				const jetons = jetonsRenouvelesDe(session)
				return jetons ? { ...token, ...jetons, erreur: undefined } : token
			}
			if (account?.access_token) {
				return {
					...token,
					accessToken: account.access_token,
					refreshToken: account.refresh_token,
					idToken: account.id_token,
					expiresAt: account.expires_at,
					estAdmin: estAdministrateur(account.access_token),
					erreur: undefined,
				}
			}
			if (token.erreur || !expirationProche(token)) {
				return token
			}
			return rafraichirJeton(token)
		},
		session({ session, token }) {
			session.estAdmin = token.estAdmin ?? false
			session.erreur = token.erreur
			return session
		},
		/** Utilisé par le proxy : une session dont le jeton n'a pu être renouvelé n'est plus valide. */
		authorized({ auth: session }) {
			return Boolean(session?.user) && !session?.erreur
		},
	},
})
