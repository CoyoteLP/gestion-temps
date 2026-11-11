/**
 * Toute page exige une session valide, sauf la connexion et les routes d'Auth.js : sans session,
 * redirection vers la page de connexion (callback `authorized` de `auth.ts`). Le jeton d'accès y
 * est aussi renouvelé avant son expiration et le cookie de session mis à jour.
 */
export { auth as proxy } from "@/auth"

export const config = {
	// Chaque exclusion est un segment entier (`/connexion`, `/connexion/…`) : une future page
	// `/connexions-actives` reste protégée. Chaîne littérale imposée par Next.js (analyse statique).
	matcher: ["/((?!(?:api/auth|connexion|_next/static|_next/image)(?:/|$)|favicon\\.ico$).*)"],
}
