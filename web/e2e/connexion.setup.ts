import { expect, test as connexion } from "@playwright/test"

import { type Compte, fichierSession, seConnecterChezLeFournisseur } from "./outils"

/**
 * Connecte une fois chaque compte par le formulaire du fournisseur et garde sa session (cookies) :
 * les parcours la réutilisent sans se reconnecter.
 */
for (const compte of ["admin", "jdupont", "pmartin"] as const satisfies readonly Compte[]) {
	connexion(`connecte ${compte}`, async ({ page }) => {
		await page.goto("/connexion")
		await seConnecterChezLeFournisseur(page, compte)
		await expect(page).toHaveURL(/\/projets$/)
		await page.context().storageState({ path: fichierSession(compte) })
	})
}
