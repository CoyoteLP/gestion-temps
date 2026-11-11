import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { FournisseurTheme } from "@/components/fournisseur-theme"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

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

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="fr"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">
				<FournisseurTheme>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster richColors />
				</FournisseurTheme>
			</body>
		</html>
	)
}
