---
name: test
description: Écrire et lancer les tests Vitest du front-end web (web/) de gestion-temps selon les conventions de web/CLAUDE.md. Avec un composant, un module ou une fonctionnalité en argument, écrit ou complète ses tests puis les exécute ; sans argument, lance toute la suite front et diagnostique les échecs.
argument-hint: "[fichier ou fonctionnalité à tester] (défaut : lancer toute la suite)"
---

# Tests — front-end web

## Mode selon l'argument

- **Sans argument** : lancer toute la suite (étape « Exécuter ») et diagnostiquer les échecs.
- **Avec argument** (`$ARGUMENTS`, ex. `src/lib/format.ts`, `menu utilisateur`) : écrire ou compléter
  les tests de la cible, puis les exécuter.

## Écrire des tests

1. **Lire la cible** en entier, et son fichier `xxx.test.ts(x)` s'il existe : compléter plutôt que
   dupliquer.
2. **Lister les comportements** avant d'écrire :
   - le cas nominal ;
   - chaque règle avec le cas **accepté** et le cas **refusé** (valeurs limites comprises) ;
   - pour le client d'API : succès, erreur avec message de l'API, erreur sans enveloppe, API
     injoignable, identifiant de corrélation transmis ;
   - pour un composant : ce que voit l'utilisateur dans chaque état (chargé, vide, erreur, droits).
3. **Respecter les conventions** de la section Tests de `web/CLAUDE.md` :
   - fichier `xxx.test.ts(x)` à côté de la cible ; `describe`/`it` en français ;
   - plusieurs entrées pour un même comportement → `it.each` ;
   - composants : `render` + `screen.getByRole` / `getByText`, interactions avec `user-event` ;
   - réseau : `vi.stubGlobal("fetch", vi.fn<typeof fetch>())` ; variables : `vi.stubEnv` ; date :
     passer l'instant en paramètre ou `vi.setSystemTime`, jamais dépendre de l'heure réelle ;
   - `server-only` est neutralisé par `vitest.config.mts` : les modules serveur se testent
     directement ; simuler `@/lib/auth/session` (`vi.mock`) pour ne pas lire de vraie session.
4. Un Server Component `async` ne se rend pas avec Testing Library : tester la logique qu'il
   appelle (fonctions de `src/lib/`) et les composants d'affichage qu'il utilise.
5. **Ne pas modifier le code de production** pour faire passer un test. Si un test révèle un bug,
   le signaler avec le test qui le démontre et proposer la correction.

## Exécuter

Depuis `web/`. Sous Windows, le chemin doit commencer par `C:` en **majuscule** (sinon Vitest charge
deux fois son runner : « No test suite found ») ; en PowerShell : `Set-Location 'C:\…\web'`.

```bash
npm test                              # toute la suite
npx vitest run src/lib/format.test.ts # un fichier
npx vitest run -t "cheminDeRetour"    # des tests par nom
```

Après des tests ciblés, relancer **toute la suite**, puis `npm run typecheck` et `npm run lint`
(les fichiers de test sont vérifiés aussi).

## Diagnostiquer un échec

- Lire le message d'assertion et le rendu DOM affiché par Testing Library.
- Distinguer : test incorrect, régression du code, ou dépendance à l'environnement (fuseau, langue,
  ordre des tests, état non nettoyé entre deux tests).
- Corriger le test seulement si c'est lui qui est faux, en expliquant pourquoi ; sinon remonter la
  régression sans la masquer.

## Compte rendu

Répondre en français :

- tests ajoutés ou modifiés, en tableau « test → comportement vérifié » ;
- résultat de la suite complète : nombre de tests passés, sortie exacte des échecs ;
- comportements non couverts ou bugs découverts.
