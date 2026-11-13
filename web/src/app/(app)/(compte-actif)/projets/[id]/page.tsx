import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { EnTetePage } from "@/components/en-tete-page"
import { MembresProjet } from "@/components/membres-projet"
import { TachesProjet } from "@/components/taches-projet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { lireProjet } from "@/lib/api/projets"
import { utilisateurCourant } from "@/lib/auth/session"
import { formaterPeriode } from "@/lib/format"
import { lireIdentifiant } from "@/lib/identifiant"
import { lirePage } from "@/lib/pagination"
import { supprimerProjetAction } from "@/lib/projets/actions"
import { lireProjetDeLaPage } from "@/lib/projets/lecture"

/**
 * Titre de l'onglet : nom du projet. La lecture est partagée avec la page (`cache`) ; en cas
 * d'échec (identifiant invalide, projet inconnu, API injoignable), un titre générique.
 */
export async function generateMetadata({ params }: PageProps<"/projets/[id]">): Promise<Metadata> {
	const id = lireIdentifiant((await params).id)
	const projet = id === null ? null : await valeurOuErreurApi(lireProjet(id))
	return { title: projet && !(projet instanceof ApiError) ? projet.nom : "Projet" }
}

export default function PageProjet({ params, searchParams }: PageProps<"/projets/[id]">) {
	return (
		<>
			<Button variant="link" className="w-fit px-0" asChild>
				<Link href="/projets">
					<ArrowLeftIcon /> Projets
				</Link>
			</Button>
			<Suspense fallback={<Chargement libelle="Chargement du projet" hauteur="h-40" />}>
				<FicheProjet params={params} searchParams={searchParams} />
			</Suspense>
		</>
	)
}

/** Projet, ses tâches et, pour l'administrateur, ses membres et les actions de modification. */
async function FicheProjet({ params, searchParams }: Readonly<PageProps<"/projets/[id]">>) {
	const [projet, utilisateur] = await Promise.all([
		params.then(({ id }) => lireProjetDeLaPage(id)),
		utilisateurCourant(),
	])
	if (projet instanceof ApiError) {
		return (
			<AlerteErreur message={projet.message} identifiantCorrelation={projet.identifiantCorrelation} />
		)
	}
	const page = lirePage((await searchParams).page)

	return (
		<>
			<EnTetePage
				titre={projet.nom}
				description={projet.code}
				actions={
					utilisateur.estAdmin && (
						<div className="flex gap-2">
							<Button variant="outline" asChild>
								<Link href={`/projets/${projet.id}/modifier`}>
									<PencilIcon /> Modifier
								</Link>
							</Button>
							<DialogueConfirmation
								titre="Supprimer le projet ?"
								description={`Le projet « ${projet.nom} » sera supprimé avec ses membres. Un projet qui a des tâches ne peut pas l'être : désactivez-le plutôt.`}
								libelleConfirmation="Supprimer"
								messageSucces="Le projet a été supprimé."
								redirection="/projets"
								action={supprimerProjetAction.bind(null, projet.id)}
								declencheur={
									<Button variant="destructive">
										<Trash2Icon /> Supprimer
									</Button>
								}
							/>
						</div>
					)
				}
			/>
			<Card>
				<CardContent>
					<dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-8 sm:gap-y-2">
						<dt className="text-sm text-muted-foreground">Statut</dt>
						<dd>
							{projet.actif ? (
								<Badge variant="secondary">Actif</Badge>
							) : (
								<Badge variant="outline">Inactif</Badge>
							)}
						</dd>
						<dt className="text-sm text-muted-foreground">Période</dt>
						<dd>{formaterPeriode(projet.dateDebut, projet.dateFin)}</dd>
						<dt className="text-sm text-muted-foreground">Description</dt>
						<dd className="whitespace-pre-line">
							{projet.description || (
								<span className="text-muted-foreground">Aucune description.</span>
							)}
						</dd>
					</dl>
				</CardContent>
			</Card>
			<Suspense fallback={<Chargement libelle="Chargement des tâches" hauteur="h-48" />}>
				<TachesProjet projetId={projet.id} page={page} estAdmin={utilisateur.estAdmin} />
			</Suspense>
			{utilisateur.estAdmin && (
				<Suspense fallback={<Chargement libelle="Chargement des membres" hauteur="h-48" />}>
					<MembresProjet projetId={projet.id} />
				</Suspense>
			)}
		</>
	)
}

function Chargement({ libelle, hauteur }: Readonly<{ libelle: string; hauteur: string }>) {
	return (
		<div aria-busy="true" aria-label={libelle}>
			<Skeleton className={`${hauteur} w-full`} />
		</div>
	)
}
