import {
	codeProjet,
	expect,
	fichierSession,
	moisPrecedent,
	seConnecterChezLeFournisseur,
	test,
} from "./outils"

test.describe("connexion", () => {
	test("renvoie vers la connexion puis revient sur la page demandée", async ({ page }) => {
		await page.goto("/saisies")
		await expect(page).toHaveURL(/\/connexion\?retour=%2Fsaisies$/)

		await seConnecterChezLeFournisseur(page, "pmartin")

		await expect(page).toHaveURL(/\/saisies$/)
		await expect(page.getByRole("heading", { name: "Saisies", level: 1 })).toBeVisible()
	})

	test("déconnecte l'utilisateur de l'application et du fournisseur", async ({ page }) => {
		await page.goto("/connexion")
		await seConnecterChezLeFournisseur(page, "pmartin")
		await expect(page).toHaveURL(/\/projets$/)

		await page.getByRole("button", { name: /^Menu de / }).click()
		await page.getByRole("menuitem", { name: "Se déconnecter" }).click()

		await expect(page).toHaveURL(/\/connexion$/)
		// Session fermée chez le fournisseur aussi : une page protégée redemande la connexion
		await page.goto("/projets")
		await expect(page).toHaveURL(/\/connexion\?retour=%2Fprojets$/)
	})
})

test.describe("droits d'un contributeur", () => {
	test.use({ storageState: fichierSession("pmartin") })

	test("ne voit ni la page Utilisateurs ni la clôture", async ({ page }) => {
		await page.goto("/projets")
		await expect(page.getByRole("link", { name: "Utilisateurs" })).toHaveCount(0)
		await page.goto("/utilisateurs")
		await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible()

		await page.goto(`/equipe?mois=${moisPrecedent()}`)
		await expect(page.getByText("Aucun projet à suivre")).toBeVisible()
		await page.goto("/projets")
		await page.getByRole("link", { name: `Projet E2E ${codeProjet()}` }).click()
		await expect(page.getByRole("heading", { name: "Clôtures" })).toBeVisible()
		await expect(page.getByRole("button", { name: "Clôturer un mois" })).toHaveCount(0)
	})
})

test.describe("droits de l'administrateur", () => {
	test.use({ storageState: fichierSession("admin") })

	test("accède à la page Utilisateurs et à la synthèse des projets", async ({ page }) => {
		await page.goto("/projets")
		await page.getByRole("link", { name: "Utilisateurs" }).click()
		await expect(page.getByRole("heading", { name: "Utilisateurs", level: 1 })).toBeVisible()

		await page.goto("/equipe")
		await expect(page.getByRole("heading", { name: "Synthèse des projets" })).toBeVisible()
	})
})
