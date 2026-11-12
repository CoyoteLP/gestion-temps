import { ClockIcon } from "lucide-react"
import type { Metadata } from "next"

import { EnTetePage } from "@/components/en-tete-page"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Saisies" }

export default function PageSaisies() {
	return (
		<>
			<EnTetePage titre="Saisies" description="Le temps passé sur les tâches de vos projets." />
			<Card className="max-w-lg">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ClockIcon className="size-4" /> Bientôt disponible
					</CardTitle>
					<CardDescription>La saisie des temps arrive dans une prochaine version.</CardDescription>
				</CardHeader>
			</Card>
		</>
	)
}
