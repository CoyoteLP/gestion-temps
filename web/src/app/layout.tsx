import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"

import { FournisseurTheme } from "@/components/fournisseur-theme"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EN_TETE_NONCE } from "@/lib/securite/en-tetes"

import "./globals.css"

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: { default: "Gestion des temps", template: "%s · Gestion des temps" },
	description: "Saisie et suivi du temps passé sur les projets",
}

/**
 * Toutes les pages sont rendues à la requête : la politique de sécurité du contenu exige un nonce
 * propre à chaque requête, qu'une page prérendue au build ne peut pas porter.
 */
export const instant = false

/**
 * Layout racine. Lit le nonce de la requête (posé par le proxy) pour le script du thème, qui doit
 * s'exécuter avant l'affichage ; Next.js l'applique lui-même à ses propres scripts.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
	const nonce = (await headers()).get(EN_TETE_NONCE) ?? undefined
	return (
		<html
			lang="fr"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">
				<FournisseurTheme nonce={nonce}>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster richColors />
				</FournisseurTheme>
			</body>
		</html>
	)
}
