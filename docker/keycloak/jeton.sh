#!/bin/sh
# Affiche un jeton d'accès du Keycloak de développement pour un compte de test.
#   ./docker/keycloak/jeton.sh jdupont                 # mot de passe = identifiant par défaut
#   JETON=$(./docker/keycloak/jeton.sh admin)
#   curl -H "Authorization: Bearer $JETON" http://localhost:8080/api/projets
utilisateur=${1:?"usage : jeton.sh <utilisateur> [mot de passe]"}
mot_de_passe=${2:-$utilisateur}
url=${KEYCLOAK_URL:-http://localhost:8180}/realms/gestion-temps/protocol/openid-connect/token

reponse=$(curl -s -d client_id=gestion-temps-dev -d grant_type=password \
	--data-urlencode "username=$utilisateur" --data-urlencode "password=$mot_de_passe" "$url")
champ=access_token
jeton=$(printf '%s' "$reponse" | sed -n "s/.*\"$champ\":\"\([^\"]*\)\".*/\1/p")
if [ -z "$jeton" ]; then
	echo "Jeton non obtenu (Keycloak démarré ? identifiants corrects ?) : $reponse" >&2
	exit 1
fi
printf '%s\n' "$jeton"
