import { describe, expect, it, vi } from "vitest"

import { lireToutesLesPages } from "./pages"
import type { PageResponse } from "./types"

const page = (numero: number, contenu: number[], pages: number): PageResponse<number> => ({
	contenu,
	page: numero,
	taille: 2,
	total: pages * 2,
	pages,
})

describe("lireToutesLesPages", () => {
	it("lit les pages une à une jusqu'à la dernière", async () => {
		const lire = vi.fn(async (numero: number) => page(numero, [numero * 10, numero * 10 + 1], 3))

		await expect(lireToutesLesPages(lire)).resolves.toEqual([10, 11, 20, 21, 30, 31])
		expect(lire.mock.calls.map(([numero]) => numero)).toEqual([1, 2, 3])
	})

	it("s'arrête à la première page d'une liste vide", async () => {
		const lire = vi.fn(async (numero: number) => page(numero, [], 0))

		await expect(lireToutesLesPages(lire)).resolves.toEqual([])
		expect(lire).toHaveBeenCalledTimes(1)
	})

	it("s'arrête sur une page vide, même si le total a changé entre deux lectures", async () => {
		const lire = vi.fn(async (numero: number) => page(numero, numero === 1 ? [1] : [], 5))

		await expect(lireToutesLesPages(lire)).resolves.toEqual([1])
		expect(lire).toHaveBeenCalledTimes(2)
	})

	it("propage l'erreur d'une lecture", async () => {
		const lire = vi.fn(async () => {
			throw new Error("refus")
		})

		await expect(lireToutesLesPages(lire)).rejects.toThrow("refus")
	})
})
