import { describe, expect, it } from "vitest"

import { schemaMembre } from "./schema-membre"

describe("schemaMembre", () => {
	it.each(["MANAGER", "BACKUP", "CONTRIBUTEUR"])(
		"accepte un utilisateur choisi avec le rôle %s",
		(role) => {
			expect(schemaMembre.safeParse({ utilisateurId: 7, role }).success).toBe(true)
		},
	)

	it("refuse l'absence de choix d'utilisateur", () => {
		const resultat = schemaMembre.safeParse({ utilisateurId: 0, role: "BACKUP" })

		expect(resultat.error?.issues[0].message).toBe("Choisissez un utilisateur")
	})

	it("refuse un rôle inconnu", () => {
		const resultat = schemaMembre.safeParse({ utilisateurId: 7, role: "ADMIN" })

		expect(resultat.error?.issues[0].message).toBe("Choisissez un rôle")
	})
})
