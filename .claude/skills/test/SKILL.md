---
name: test
description: Écrire et lancer les tests du projet gestion-temps selon les conventions de CLAUDE.md. Avec une classe ou une fonctionnalité en argument, écrit ou complète ses tests puis les exécute ; sans argument, lance toute la suite et diagnostique les échecs. À utiliser pour ajouter des tests, vérifier une modification ou analyser un test en échec.
argument-hint: "[classe ou fonctionnalité à tester] (défaut : lancer toute la suite)"
---

# Tests — gestion-temps

## Mode selon l'argument

- **Sans argument** : lancer toute la suite (étape « Exécuter ») et diagnostiquer les échecs.
- **Avec argument** (`$ARGUMENTS`, ex. `TacheService`, `suppression d'un projet`) : écrire ou compléter
  les tests de la cible, puis les exécuter.

## Écrire des tests

1. **Lire la cible** en entier, ainsi que la classe de test existante si elle existe : compléter
   plutôt que dupliquer, et réutiliser ses méthodes `save(...)`.
2. **Lister les comportements** à couvrir avant d'écrire :
   - le cas nominal ;
   - chaque règle métier, avec le cas **accepté** et le cas **refusé** (y compris la valeur limite) ;
   - les erreurs : ressource inconnue (404), conflit (409), règle métier (422), validation (400) ;
   - les effets de bord : rien n'est enregistré ni modifié quand la requête est refusée.
3. **Respecter les conventions** de la section Tests de `CLAUDE.md` :
   - classe nommée classe cible + `Test`, dans le même paquet que la cible ;
   - contrôleur : `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional` ;
   - classe sans dépendance Spring (validateur, utilitaire) : test unitaire simple, sans contexte Spring ;
   - méthodes nommées en français d'après le comportement (`deleteProjetRefuseSiTachesExistantes`) ;
   - données préparées via les repositories dans des méthodes privées `save(...)` ;
   - corps vérifié sous `$.data` (succès) ou `$.message` (erreur), `$.status` pour l'enveloppe ;
   - plusieurs valeurs d'entrée pour un même comportement → `@ParameterizedTest`
     (`@ValueSource`, `@CsvSource`) ;
   - date courante : ne pas dépendre du jour d'exécution ; remplacer le bean `Clock` par une
     horloge fixe (voir `SaisieTempsControllerTest.HorlogeFixe`).
4. **Ne pas comparer mot pour mot** les messages Bean Validation par défaut (ils dépendent de la
   langue de la JVM) ; les messages définis dans l'application peuvent être comparés exactement.
5. **Ne pas modifier le code de production** pour faire passer un test. Si un test révèle un bug,
   le signaler à l'utilisateur avec le test qui le démontre, et proposer la correction.

## Exécuter

```bash
./mvnw test                                   # toute la suite
./mvnw test -Dtest=SaisieTempsControllerTest  # une classe
./mvnw test -Dtest='SaisieTempsControllerTest#createRefuse*'   # des méthodes
```

Pour une sortie lisible, filtrer : `./mvnw test 2>&1 | grep -E "Tests run:|FAIL|BUILD|expected"`.
Après avoir écrit des tests ciblés, relancer **toute la suite** pour vérifier l'absence de régression.

## Diagnostiquer un échec

- Lire le message d'assertion et le rapport `target/surefire-reports/<Classe>.txt`.
- Distinguer : test incorrect (attente erronée), régression du code, ou dépendance à l'environnement
  (langue, date, ordre des tests).
- Corriger le test seulement si c'est lui qui est faux, en expliquant pourquoi ; sinon remonter la
  régression sans la masquer.

## Compte rendu

Répondre en français :
- tests ajoutés ou modifiés, sous forme de tableau « test → comportement vérifié » ;
- résultat de la suite complète : nombre de tests passés, et sortie exacte des échecs s'il y en a ;
- comportements non couverts ou bugs découverts, s'il y en a.
