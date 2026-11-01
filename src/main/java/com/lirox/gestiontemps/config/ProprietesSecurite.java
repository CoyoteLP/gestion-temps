package com.lirox.gestiontemps.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Paramètres de sécurité propres à l'application ({@code gestion-temps.securite.*}), indépendants
 * du fournisseur OIDC choisi.
 *
 * @param claimRoles         chemin de la revendication du jeton qui porte les rôles, segments séparés
 *                           par des points pour une revendication imbriquée (ex. {@code roles} ou
 *                           {@code realm_access.roles} pour Keycloak)
 * @param exigerEmailVerifie true (par défaut) : un compte n'est rattaché par email que si le jeton
 *                           porte {@code email_verified = true} ; false : l'absence de cette
 *                           revendication est acceptée (fournisseur qui garantit lui-même les emails),
 *                           seule la valeur {@code false} est refusée
 */
@ConfigurationProperties("gestion-temps.securite")
public record ProprietesSecurite(
		@DefaultValue("roles") String claimRoles,
		@DefaultValue("true") boolean exigerEmailVerifie) {
}
