import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Sans `globals: true`, Testing Library ne démonte pas les composants entre deux tests
afterEach(() => {
	cleanup()
})

// API du navigateur absentes de jsdom, utilisées par les composants Radix (taille d'une case à
// cocher) et par la barre latérale (détection du mobile) : substituts sans effet
if (!("ResizeObserver" in globalThis)) {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
}
if (!window.matchMedia) {
	window.matchMedia = (requete: string) =>
		({
			matches: false,
			media: requete,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList
}
