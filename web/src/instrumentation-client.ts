import { config } from "zod"

// Exécuté dans le navigateur avant le code de l'application (convention de Next.js).
//
// zod compile ses validations avec `new Function` quand l'environnement le permet, et le vérifie
// au premier usage. La politique de sécurité du contenu (CSP, sans 'unsafe-eval') l'interdit : le
// navigateur signale alors une violation, même si zod se replie ensuite sur sa validation
// classique. Le mode `jitless` évite cette compilation et ce test.
config({ jitless: true })
