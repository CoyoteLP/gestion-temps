import { defineConfig, devices } from "@playwright/test"

// Code du projet propre à l'exécution : fixé une fois par le processus principal, hérité par les
// processus de test (qui relisent cette configuration sans le changer)
process.env.E2E_CODE_PROJET ??= `E2E-${Date.now() % 100_000_000}`

/**
 * Tests de bout en bout contre la pile de docker/e2e/compose.yaml (front sur 3100, Keycloak sur
 * 8280, API sur 8090), à démarrer avant : voir le README, « Tests de bout en bout ».
 *
 * Les tests partagent des données (une clôture de mois agit sur les saisies) : exécutés l'un après
 * l'autre. Projets : préparation des données par l'API, connexion de chaque compte, puis parcours.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
	timeout: 60_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: process.env.E2E_URL ?? "http://localhost:3100",
		locale: "fr-FR",
		timezoneId: "Europe/Paris",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		launchOptions: {
			// Keycloak est nommé `keycloak` pour les conteneurs : le navigateur le joint sur ce poste
			args: ["--host-resolver-rules=MAP keycloak 127.0.0.1"],
		},
	},
	projects: [
		{ name: "preparation", testMatch: /preparation\.setup\.ts/ },
		{ name: "connexion", testMatch: /connexion\.setup\.ts/, dependencies: ["preparation"] },
		{
			name: "parcours",
			testMatch: /\.spec\.ts/,
			dependencies: ["connexion"],
			use: { ...devices["Desktop Chrome"] },
		},
	],
})
