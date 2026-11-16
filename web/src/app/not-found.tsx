import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PAGE_ACCUEIL } from "@/lib/constantes"

export default function PageIntrouvable() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
			<h1 className="text-2xl font-semibold">Page introuvable</h1>
			<p className="text-muted-foreground">La page demandée n&apos;existe pas ou a été déplacée.</p>
			<Button asChild>
				<Link href={PAGE_ACCUEIL}>Retour à l&apos;accueil</Link>
			</Button>
		</main>
	)
}
