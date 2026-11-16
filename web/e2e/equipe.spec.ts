import { COMPTES, expect, fichierSession, lireDonnees, lundiDe, test } from "./outils"

/**
 * Clôture d'un mois par le responsable, lecture seule pour le contributeur, réouverture par
 * l'administrateur : trois étapes enchaînées sur le mois précédent du projet de l'exécution.
 */
test.describe.serial("équipe et clôture du mois", () => {
	const nomPmartin = `${COMPTES.pmartin.prenom} ${COMPTES.pmartin.nom}`

	test.describe(() => {
		test.use({ storageState: fichierSession("jdupont") })

		test("le responsable consulte le récapitulatif du mois et le clôture", async ({ page }) => {
			const { projetId, moisPrecedent, totalHeures } = lireDonnees()
			await page.goto(`/equipe?projet=${projetId}&mois=${moisPrecedent}`)

			await expect(
				page.getByRole("row", { name: new RegExp(`^${nomPmartin} Contributeur`) }),
			).toContainText(`${totalHeures} h`)
			await expect(page.getByText("Ouvert", { exact: true })).toBeVisible()

			await page.getByRole("button", { name: "Clôturer ce mois" }).click()
			await page.getByRole("dialog").getByRole("button", { name: "Clôturer", exact: true }).click()

			await expect(page.getByText(/^Mois clôturé : /)).toBeVisible()
			await expect(page.getByText("Clôturé", { exact: true })).toBeVisible()
		})
	})

	test.describe(() => {
		test.use({ storageState: fichierSession("pmartin") })

		test("le contributeur voit ses saisies du mois clôturé en lecture seule", async ({ page }) => {
			const { codeProjet, tache, joursSaisis } = lireDonnees()
			await page.goto(`/saisies?semaine=${lundiDe(joursSaisis[0])}`)

			await expect(page.getByText("Mois clôturé : saisie en lecture seule").first()).toBeVisible()
			await expect(
				page.getByRole("button", {
					name: new RegExp(`^Modifier la saisie ${codeProjet} · ${tache}`),
				}),
			).toHaveCount(0)
		})
	})

	test.describe(() => {
		test.use({ storageState: fichierSession("admin") })

		test("l'administrateur rouvre le mois depuis la synthèse des projets", async ({ page }) => {
			const { codeProjet, moisPrecedent, totalHeures } = lireDonnees()
			await page.goto(`/equipe?mois=${moisPrecedent}&synthese.projet=${codeProjet}`)

			const ligne = page
				.getByRole("region", { name: "Synthèse des projets" })
				// Ligne du projet (pas celle des filtres, où le code est saisi)
				.getByRole("row", { name: new RegExp(`^${codeProjet} · `) })
			await expect(ligne).toContainText("Clôturé")
			await expect(ligne).toContainText(`${totalHeures} h`)

			await ligne.getByRole("button", { name: new RegExp(`^Rouvrir .* pour ${codeProjet}$`) }).click()
			await page.getByRole("alertdialog").getByRole("button", { name: "Rouvrir" }).click()

			await expect(page.getByText(/^Mois rouvert : /)).toBeVisible()
			await expect(ligne).toContainText("Ouvert")
		})
	})
})
