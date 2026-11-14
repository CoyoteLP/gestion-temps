package com.lirox.gestiontemps.config;

import java.util.Arrays;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.lirox.gestiontemps.dto.ValeurParametre;

/**
 * Lecture des énumérations {@link ValeurParametre} dans les paramètres de requête par leur valeur
 * d'API ({@code tri=dateDebut}, {@code sens=desc}) plutôt que par le nom de la constante Java. Une
 * valeur inconnue fait échouer la conversion : 400, avec les valeurs admises dans le message (voir
 * {@code GlobalExceptionHandler}).
 */
@Configuration
public class ConversionParametresConfig implements WebMvcConfigurer {

	@Override
	public void addFormatters(FormatterRegistry registry) {
		registry.addConverterFactory(new ConversionValeurParametre());
	}

	/** Conversion d'une chaîne vers la constante dont {@link ValeurParametre#valeur()} est égale. */
	static final class ConversionValeurParametre implements ConverterFactory<String, ValeurParametre> {

		@Override
		public <T extends ValeurParametre> Converter<String, T> getConverter(Class<T> type) {
			return source -> Arrays.stream(type.getEnumConstants())
					.filter(constante -> constante.valeur().equals(source.trim()))
					.findFirst()
					// Message technique, jamais renvoyé tel quel : le handler en produit un en français
					.orElseThrow(() -> new IllegalArgumentException("Valeur non admise"));
		}

	}

}
