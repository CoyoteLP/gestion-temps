import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const REQUETE_MOBILE = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function abonner(surChangement: () => void): () => void {
	const requete = window.matchMedia(REQUETE_MOBILE)
	requete.addEventListener("change", surChangement)
	return () => requete.removeEventListener("change", surChangement)
}

/**
 * Indique si l'écran est de largeur mobile (utilisé par la barre latérale shadcn). Rendu serveur :
 * faux, puis valeur réelle à l'hydratation.
 *
 * @returns vrai si la fenêtre est plus étroite que le seuil mobile
 */
export function useIsMobile(): boolean {
	return useSyncExternalStore(
		abonner,
		() => window.matchMedia(REQUETE_MOBILE).matches,
		() => false,
	)
}
