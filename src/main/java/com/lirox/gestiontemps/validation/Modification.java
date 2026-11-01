package com.lirox.gestiontemps.validation;

/**
 * Groupe Bean Validation des contraintes propres à une modification ({@code PUT}), en plus des
 * contraintes par défaut : par exemple la version, obligatoire pour modifier mais pas pour créer.
 * <p>
 * Activé dans le contrôleur par {@code @Validated({Default.class, Modification.class})}.
 */
public interface Modification {
}
