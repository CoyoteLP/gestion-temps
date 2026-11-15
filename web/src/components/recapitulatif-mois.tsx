import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Recapitulatif } from "@/lib/equipe/recapitulatif"
import { formaterDuree } from "@/lib/format"
import { LIBELLES_ROLE_PROJET } from "@/lib/membres/schema-membre"

type Props = Readonly<{ recapitulatif: Recapitulatif }>

/**
 * Récapitulatif du mois d'un projet : total par membre (0 h compris, anciens membres ensuite), total
 * par tâche, total du projet.
 */
export function RecapitulatifMois({ recapitulatif }: Props) {
	const { parMembre, parTache, total } = recapitulatif
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card className="gap-2 pb-0">
				<CardHeader>
					<CardTitle>Par membre</CardTitle>
				</CardHeader>
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-4">Membre</TableHead>
								<TableHead className="hidden sm:table-cell">Rôle</TableHead>
								<TableHead className="pr-4 text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{parMembre.length === 0 ? (
								<TableRow>
									<TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
										Aucun membre.
									</TableCell>
								</TableRow>
							) : (
								parMembre.map((membre) => (
									<TableRow key={membre.utilisateurId}>
										<TableCell className="pl-4 font-medium">{membre.nom}</TableCell>
										<TableCell className="hidden text-muted-foreground sm:table-cell">
											{membre.role ? LIBELLES_ROLE_PROJET[membre.role] : "Plus membre"}
										</TableCell>
										<TableCell
											className={`pr-4 text-right tabular-nums ${membre.total === 0 ? "text-muted-foreground" : ""}`}
										>
											{formaterDuree(membre.total)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell className="pl-4 font-medium" colSpan={2}>
									Total du projet
								</TableCell>
								<TableCell className="pr-4 text-right font-semibold tabular-nums">
									{formaterDuree(total)}
								</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</CardContent>
			</Card>
			<Card className="gap-2 pb-0">
				<CardHeader>
					<CardTitle>Par tâche</CardTitle>
				</CardHeader>
				<CardContent className="px-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-4">Tâche</TableHead>
								<TableHead className="pr-4 text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{parTache.length === 0 ? (
								<TableRow>
									<TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
										Aucune saisie ce mois-ci.
									</TableCell>
								</TableRow>
							) : (
								parTache.map((tache) => (
									<TableRow key={tache.tacheId}>
										<TableCell className="pl-4 font-medium">{tache.libelle}</TableCell>
										<TableCell className="pr-4 text-right tabular-nums">
											{formaterDuree(tache.total)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell className="pl-4 font-medium">Total du projet</TableCell>
								<TableCell className="pr-4 text-right font-semibold tabular-nums">
									{formaterDuree(total)}
								</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
