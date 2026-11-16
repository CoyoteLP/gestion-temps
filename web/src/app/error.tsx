"use client"

import { Button } from "@/components/ui/button"

/** Erreur inattendue d'une page : le détail technique reste dans les logs du serveur. */
export default function Erreur({
	error,
	retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
			<h1 className="text-2xl font-semibold">Une erreur inattendue s&apos;est produite</h1>
			<p className="text-muted-foreground">Réessayez dans quelques instants.</p>
			{error.digest && (
				<p className="text-xs text-muted-foreground">
					Référence : <code>{error.digest}</code>
				</p>
			)}
			<Button onClick={() => retry()}>Réessayer</Button>
		</main>
	)
}
