import { ClockIcon, LogInIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { seConnecter } from "@/lib/auth/actions"
import { messageErreurConnexion } from "@/lib/auth/erreurs-connexion"
import { cheminDepuisUrl } from "@/lib/auth/redirection"

export const metadata: Metadata = { title: "Connexion" }

export default function PageConnexion({ searchParams }: PageProps<"/connexion">) {
	return (
		<main className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<span className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<ClockIcon className="size-5" />
					</span>
					<CardTitle className="text-xl">Gestion des temps</CardTitle>
					<CardDescription>
						Connectez-vous pour saisir et suivre votre temps de travail.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<BoutonConnexion retour="" />}>
						<FormulaireConnexion searchParams={searchParams} />
					</Suspense>
				</CardContent>
			</Card>
		</main>
	)
}

/** Lit l'URL (page demandée, erreur renvoyée par Auth.js) : rendu à la requête. */
async function FormulaireConnexion({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
	const { callbackUrl, error } = await searchParams
	const erreur = messageErreurConnexion(error)
	return (
		<div className="flex flex-col gap-4">
			{erreur && <AlerteErreur titre="Connexion impossible" message={erreur} />}
			<BoutonConnexion retour={cheminDepuisUrl(callbackUrl)} />
		</div>
	)
}

function BoutonConnexion({ retour }: { retour: string }) {
	return (
		<form action={seConnecter}>
			<input type="hidden" name="retour" value={retour} />
			<Button type="submit" className="w-full">
				<LogInIcon /> Se connecter
			</Button>
		</form>
	)
}
