import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import type { PageResponse } from "@/lib/api/types"

type Props = {
	page: Pick<PageResponse<unknown>, "page" | "pages" | "total">
	/** Chemin de la liste ; le numéro de page est ajouté en paramètre `page`. */
	chemin: string
	/** Libellé des éléments au pluriel (« projets »). */
	libelle: string
}

/** Pied de liste paginée : total, page courante, liens précédente et suivante. */
export function PaginationListe({ page, chemin, libelle }: Props) {
	const lien = (numero: number) => `${chemin}?page=${numero}`

	return (
		<div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
			<p className="text-sm text-muted-foreground">
				{page.total} {libelle} — page {Math.min(page.page, Math.max(page.pages, 1))} sur{" "}
				{Math.max(page.pages, 1)}
			</p>
			{page.pages > 1 && (
				<Pagination className="mx-0 w-auto">
					<PaginationContent>
						{page.page > 1 && (
							<PaginationItem>
								<PaginationPrevious href={lien(page.page - 1)} text="Précédente" />
							</PaginationItem>
						)}
						{page.page < page.pages && (
							<PaginationItem>
								<PaginationNext href={lien(page.page + 1)} text="Suivante" />
							</PaginationItem>
						)}
					</PaginationContent>
				</Pagination>
			)}
		</div>
	)
}
