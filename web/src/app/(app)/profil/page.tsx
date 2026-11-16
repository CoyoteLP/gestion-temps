import { ExternalLinkIcon } from "lucide-react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { CompteEnAttente } from "@/components/compte-en-attente"
import { EnTetePage } from "@/components/en-tete-page"
import { FormulaireProfil } from "@/components/formulaire-profil"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/erreurs"
import type { Utilisateur } from "@/lib/api/modeles"
import { lireMonCompte } from "@/lib/api/utilisateurs"
import { urlConsoleCompte } from "@/lib/auth/compte-connexion"
import { utilisateurCourant } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Profil" }

export default function PageProfil() {
	return (
		<>
			<EnTetePage
				titre="Profil"
				description="Vos informations personnelles et votre compte de connexion."
			/>
			<div className="flex max-w-lg flex-col gap-4">
				<Suspense
					fallback={
						<div aria-busy="true" aria-label="Chargement du profil">
							<Skeleton className="h-72 w-full" />
						</div>
					}
				>
					<Identite />
				</Suspense>
				<Card>
					<CardHeader>
						<CardTitle>Compte de connexion</CardTitle>
						<CardDescription>
							Votre mot de passe et votre adresse email sont gérés par le service de connexion.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Suspense fallback={<Skeleton className="h-9 w-64" />}>
							<LienConsoleCompte />
						</Suspense>
					</CardContent>
				</Card>
			</div>
		</>
	)
}

/** Fiche de l'utilisateur dans l'API : formulaire, ou état de l'inscription s'il n'en a pas. */
async function Identite() {
	const utilisateur = await utilisateurCourant()
	let compte: Utilisateur | null
	try {
		compte = await lireMonCompte()
	} catch (erreur) {
		if (erreur instanceof ApiError) {
			return (
				<AlerteErreur
					message={erreur.message}
					identifiantCorrelation={erreur.identifiantCorrelation}
				/>
			)
		}
		throw erreur
	}
	const role = utilisateur.estAdmin ? "Administrateur" : "Collaborateur"

	if (!compte) {
		if (!utilisateur.estAdmin) {
			return <CompteEnAttente etat="absent" />
		}
		return (
			<Card>
				<CardHeader>
					<CardTitle>Identité</CardTitle>
					<CardDescription>
						Aucune fiche utilisateur n&apos;est associée à votre compte administrateur : elle
						n&apos;est nécessaire que pour saisir du temps.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
						<dt className="text-muted-foreground">Email</dt>
						<dd>{utilisateur.email}</dd>
						<dt className="text-muted-foreground">Rôle</dt>
						<dd>{role}</dd>
					</dl>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Identité</CardTitle>
				<CardDescription>
					Le nom sous lequel vous apparaissez dans l&apos;application.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Email</dt>
					<dd>{compte.email}</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd>
						{compte.actif ? (
							<Badge variant="secondary">Actif</Badge>
						) : (
							<Badge variant="outline">En attente de validation</Badge>
						)}
					</dd>
					<dt className="text-muted-foreground">Rôle</dt>
					<dd>{role}</dd>
				</dl>
				<FormulaireProfil
					key={compte.version}
					nom={compte.nom}
					prenom={compte.prenom}
					version={compte.version}
				/>
			</CardContent>
		</Card>
	)
}

/** Lien vers la console de compte du fournisseur, lue dans la configuration à l'exécution. */
async function LienConsoleCompte() {
	await connection()
	const url = urlConsoleCompte()
	if (!url) {
		return <p className="text-sm text-muted-foreground">Console de compte indisponible.</p>
	}
	return (
		<Button asChild variant="outline">
			<a href={url} target="_blank" rel="noopener noreferrer">
				Gérer mon compte de connexion <ExternalLinkIcon />
				<span className="sr-only">(nouvel onglet)</span>
			</a>
		</Button>
	)
}
