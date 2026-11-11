import "next-auth"
import "next-auth/jwt"

/** Erreur posée sur la session quand le jeton d'accès n'a pas pu être renouvelé. */
type ErreurSession = "RenouvellementImpossible"

declare module "next-auth/jwt" {
	/** Contenu du cookie de session chiffré : lisible par le serveur Next.js seulement. */
	interface JWT {
		accessToken?: string
		refreshToken?: string
		idToken?: string
		/** Expiration du jeton d'accès, en secondes depuis l'époque Unix. */
		expiresAt?: number
		estAdmin?: boolean
		erreur?: ErreurSession
	}
}

declare module "next-auth" {
	/** Session exposée aux composants : aucun jeton, seulement ce que l'interface affiche. */
	interface Session {
		estAdmin: boolean
		erreur?: ErreurSession
	}
}
