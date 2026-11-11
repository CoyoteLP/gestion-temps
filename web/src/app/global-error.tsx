"use client"

import "./globals.css"

/**
 * Erreur du layout racine : remplace tout le document (ni thème, ni polices, ni metadata du
 * layout). Couleurs selon le thème du système. Le détail technique reste dans les logs du serveur.
 */
export default function ErreurGlobale({
	error,
	retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
	return (
		<html lang="fr">
			<body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground antialiased">
				<title>Erreur · Gestion des temps</title>
				<h1 className="text-2xl font-semibold">Une erreur inattendue s&apos;est produite</h1>
				<p className="text-muted-foreground">Réessayez dans quelques instants.</p>
				{error.digest && (
					<p className="text-xs text-muted-foreground">
						Référence : <code>{error.digest}</code>
					</p>
				)}
				<button
					type="button"
					onClick={() => retry()}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					Réessayer
				</button>
			</body>
		</html>
	)
}
