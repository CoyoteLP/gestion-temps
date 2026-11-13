import { UserXIcon } from "lucide-react"
import Link from "next/link"

import { AlerteErreur } from "@/components/alerte-erreur"
import { BoutonActivation } from "@/components/bouton-activation"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { PaginationListe } from "@/components/pagination-liste"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { listerUtilisateurs } from "@/lib/api/utilisateurs"
import { formaterDate, nomComplet } from "@/lib/format"
import { changerActivationAction } from "@/lib/utilisateurs/actions"
import { FILTRES_UTILISATEURS, type FiltreUtilisateurs } from "@/lib/utilisateurs/filtre"

const CHEMIN = "/utilisateurs"

type Props = Readonly<{
	filtre: FiltreUtilisateurs
	/** Numéro de page, à partir de 1. */
	page: number
}>

/**
 * Comptes utilisateurs filtrés par statut, avec leur activation ou leur désactivation
 * (administrateur). Lit l'API : à placer dans un `<Suspense>`.
 */
export async function ListeUtilisateurs({ filtre, page }: Props) {
	const utilisateurs = await valeurOuErreurApi(listerUtilisateurs(filtre.actif, page))
	if (utilisateurs instanceof ApiError) {
		return (
			<AlerteErreur
				message={utilisateurs.message}
				identifiantCorrelation={utilisateurs.identifiantCorrelation}
			/>
		)
	}
	return (
		<>
			<nav aria-label="Filtrer par statut" className="flex gap-1">
				{FILTRES_UTILISATEURS.map((choix) => {
					const courant = choix.valeur === filtre.valeur
					return (
						<Button
							key={choix.valeur}
							variant={courant ? "secondary" : "ghost"}
							size="sm"
							asChild
						>
							<Link
								href={`${CHEMIN}?statut=${choix.valeur}`}
								aria-current={courant ? "page" : undefined}
							>
								{choix.libelle}
							</Link>
						</Button>
					)
				})}
			</nav>
			<Card className="py-0">
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-4">Nom</TableHead>
								<TableHead className="hidden md:table-cell">Email</TableHead>
								<TableHead className="hidden lg:table-cell">Inscription</TableHead>
								<TableHead>Statut</TableHead>
								<TableHead className="pr-4 text-right">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{utilisateurs.contenu.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
										{filtre.actif === false
											? "Aucun compte en attente."
											: "Aucun utilisateur."}
									</TableCell>
								</TableRow>
							) : (
								utilisateurs.contenu.map((utilisateur) => {
									const nom = nomComplet(utilisateur)
									return (
										<TableRow key={utilisateur.id}>
											<TableCell className="pl-4 font-medium">{nom}</TableCell>
											<TableCell className="hidden text-muted-foreground md:table-cell">
												{utilisateur.email}
											</TableCell>
											<TableCell className="hidden text-muted-foreground lg:table-cell">
												{utilisateur.audit
													? formaterDate(utilisateur.audit.creeLe)
													: null}
											</TableCell>
											<TableCell>
												{utilisateur.actif ? (
													<Badge variant="secondary">Actif</Badge>
												) : (
													<Badge variant="outline">Inactif</Badge>
												)}
											</TableCell>
											<TableCell className="pr-4 text-right">
												{utilisateur.actif ? (
													<DialogueConfirmation
														titre="Désactiver ce compte ?"
														description={`${nom} n'aura plus accès aux projets ni aux saisies, jusqu'à une nouvelle activation. Ses saisies de temps sont conservées.`}
														libelleConfirmation="Désactiver"
														messageSucces={`Le compte de ${nom} est désactivé.`}
														action={changerActivationAction.bind(
															null,
															utilisateur.id,
															false,
															utilisateur.version,
														)}
														declencheur={
															<Button variant="outline" size="sm">
																<UserXIcon /> Désactiver
															</Button>
														}
													/>
												) : (
													<BoutonActivation
														nom={nom}
														action={changerActivationAction.bind(
															null,
															utilisateur.id,
															true,
															utilisateur.version,
														)}
													/>
												)}
											</TableCell>
										</TableRow>
									)
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<PaginationListe
				page={utilisateurs}
				chemin={CHEMIN}
				parametres={{ statut: filtre.valeur }}
				libelle={utilisateurs.total > 1 ? "utilisateurs" : "utilisateur"}
			/>
		</>
	)
}
