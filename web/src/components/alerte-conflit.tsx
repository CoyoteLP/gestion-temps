"use client"

import { RotateCwIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type Props = Readonly<{
	titre: string
	/** Message de l'API (409), qui précise la cause. */
	message: string
}>

/** Conflit 409 : la ressource a changé depuis sa lecture ; propose de recharger la page. */
export function AlerteConflit({ titre, message }: Props) {
	const router = useRouter()

	return (
		<Alert variant="destructive">
			<AlertTitle>{titre}</AlertTitle>
			<AlertDescription>
				<p>{message}</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={() => router.refresh()}
				>
					<RotateCwIcon /> Recharger
				</Button>
			</AlertDescription>
		</Alert>
	)
}
