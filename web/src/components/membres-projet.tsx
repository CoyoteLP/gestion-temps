import { PencilIcon, UserPlusIcon, UserMinusIcon } from "lucide-react"

import { AlerteErreur } from "@/components/alerte-erreur"
import { DialogueConfirmation } from "@/components/dialogue-confirmation"
import { type ChoixUtilisateur, DialogueMembre } from "@/components/dialogue-membre"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError, valeurOuErreurApi } from "@/lib/api/erreurs"
import { formaterUtilisateur, nomComplet } from "@/lib/format"
import { retirerMembreAction } from "@/lib/membres/actions"
import { lireMembresDuProjet } from "@/lib/membres/membres-du-projet"
import { LIBELLES_ROLE_PROJET } from "@/lib/membres/schema-membre"

/**
 * Membres d'un projet et leur rôle, réservés à l'administrateur (seul à pouvoir lire les noms et
 * modifier la liste). Lit l'API : à placer dans un `<Suspense>`.
 */
export async function MembresProjet({ projetId }: Readonly<{ projetId: number }>) {
	const resultat = await valeurOuErreurApi(lireMembresDuProjet(projetId))
	if (resultat instanceof ApiError) {
		return (
			<AlerteErreur
				titre="Impossible d'afficher les membres"
				message={resultat.message}
				identifiantCorrelation={resultat.identifiantCorrelation}
			/>
		)
	}
	const { membres, candidats } = resultat
	const choix: ChoixUtilisateur[] = candidats.map((fiche) => ({
		id: fiche.id,
		libelle: formaterUtilisateur(fiche),
	}))

	return (
		<Card className="gap-0 pb-0">
			<CardHeader className="border-b">
				<CardTitle>
					<h2>Membres</h2>
				</CardTitle>
				<CardDescription>
					Ils consultent les saisies du projet et peuvent clôturer ses mois.
				</CardDescription>
				<CardAction>
					<DialogueMembre
						mode="ajout"
						projetId={projetId}
						candidats={choix}
						declencheur={
							<Button size="sm">
								<UserPlusIcon /> Ajouter un membre
							</Button>
						}
					/>
				</CardAction>
			</CardHeader>
			<CardContent className="px-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-4">Nom</TableHead>
							<TableHead className="hidden md:table-cell">Email</TableHead>
							<TableHead>Rôle</TableHead>
							<TableHead className="pr-4 text-right">
								<span className="sr-only">Actions</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{membres.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
									Aucun membre.
								</TableCell>
							</TableRow>
						) : (
							membres.map((membre) => {
								const nom = membre.utilisateur
									? nomComplet(membre.utilisateur)
									: `Utilisateur n° ${membre.utilisateurId}`
								return (
									<TableRow key={membre.id}>
										<TableCell className="pl-4 font-medium">
											{nom}
											{membre.utilisateur && !membre.utilisateur.actif && (
												<Badge variant="outline" className="ml-2">
													Inactif
												</Badge>
											)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground md:table-cell">
											{membre.utilisateur?.email}
										</TableCell>
										<TableCell>{LIBELLES_ROLE_PROJET[membre.role]}</TableCell>
										<TableCell className="pr-4 text-right">
											<DialogueMembre
												mode="modification"
												projetId={projetId}
												membre={{
													id: membre.id,
													version: membre.version,
													role: membre.role,
													utilisateur: {
														id: membre.utilisateurId,
														libelle: membre.utilisateur
															? formaterUtilisateur(membre.utilisateur)
															: nom,
													},
												}}
												declencheur={
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Modifier le rôle de ${nom}`}
													>
														<PencilIcon />
													</Button>
												}
											/>
											<DialogueConfirmation
												titre="Retirer ce membre ?"
												description={`${nom} ne sera plus membre du projet ; ses saisies de temps sont conservées.`}
												libelleConfirmation="Retirer"
												messageSucces="Le membre a été retiré du projet."
												action={retirerMembreAction.bind(null, projetId, membre.id)}
												declencheur={
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Retirer ${nom} du projet`}
													>
														<UserMinusIcon />
													</Button>
												}
											/>
										</TableCell>
									</TableRow>
								)
							})
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
