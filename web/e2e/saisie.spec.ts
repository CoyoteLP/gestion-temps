import { aujourdhui, expect, fichierSession, lireDonnees, test } from "./outils"

test.use({ storageState: fichierSession("pmartin") })

test("saisit, corrige et supprime du temps, avec les messages de la journée", async ({ page }) => {
	const { codeProjet, tache } = lireDonnees()
	// Jour du mois en cours : jamais dans un mois clôturé (seul un mois terminé se clôture)
	const jour = aujourdhui()
	const saisie = new RegExp(`${codeProjet} · ${tache} du`)
	await page.goto("/saisies")

	// Création : au-delà de 8 h, avertissement ; l'enregistrement reste possible
	await page.getByRole("button", { name: "Nouvelle saisie" }).click()
	const dialogue = page.getByRole("dialog", { name: "Nouvelle saisie" })
	await dialogue.getByRole("combobox", { name: "Projet" }).click()
	await page.getByRole("option", { name: new RegExp(`^${codeProjet} · `) }).click()
	await dialogue.getByRole("combobox", { name: "Tâche" }).click()
	await page.getByRole("option", { name: tache }).click()
	await dialogue.getByLabel("Jour").fill(jour)
	await dialogue.getByLabel("Durée (heures)").fill("9")
	await expect(dialogue.getByText("la journée atteindra 9 h, au-delà de 8 h")).toBeVisible()
	await dialogue.getByLabel("Durée (heures)").fill("20")
	await dialogue.getByRole("button", { name: "Enregistrer" }).click()
	await expect(page.getByText("La saisie a été enregistrée.")).toBeVisible()
	await expect(dialogue).toBeHidden()

	// Correction
	await page.getByRole("button", { name: new RegExp(`^Modifier la saisie ${saisie.source}`) }).click()
	const modification = page.getByRole("dialog", { name: "Modifier la saisie" })
	await modification.getByLabel("Durée (heures)").fill("19.5")
	await modification.getByRole("button", { name: "Enregistrer" }).click()
	await expect(page.getByText("La saisie a été modifiée.")).toBeVisible()

	// Au-delà de 24 h dans la journée : erreur avant l'envoi (l'API refuserait)
	await page.getByRole("button", { name: "Nouvelle saisie" }).click()
	await dialogue.getByRole("combobox", { name: "Projet" }).click()
	await page.getByRole("option", { name: new RegExp(`^${codeProjet} · `) }).click()
	await dialogue.getByLabel("Jour").fill(jour)
	await dialogue.getByLabel("Durée (heures)").fill("5")
	await expect(dialogue.getByText(/Le total de la journée dépasse 24 h/)).toBeVisible()
	await dialogue.getByRole("button", { name: "Annuler" }).click()

	// Suppression, après confirmation
	await page.getByRole("button", { name: new RegExp(`^Supprimer la saisie ${saisie.source}`) }).click()
	await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click()
	await expect(page.getByText("La saisie a été supprimée.")).toBeVisible()
	await expect(
		page.getByRole("button", { name: new RegExp(`^Supprimer la saisie ${saisie.source}`) }),
	).toHaveCount(0)
})
