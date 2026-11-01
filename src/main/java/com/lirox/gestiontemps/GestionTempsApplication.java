package com.lirox.gestiontemps;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée de l'API REST de gestion du temps de travail.
 */
@SpringBootApplication
public class GestionTempsApplication {

	/**
	 * Démarre l'application Spring Boot.
	 *
	 * @param args arguments de la ligne de commande
	 */
	public static void main(String[] args) {
		SpringApplication.run(GestionTempsApplication.class, args);
	}

}
