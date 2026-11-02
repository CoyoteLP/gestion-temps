package com.lirox.gestiontemps.domain;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;

/**
 * Traçabilité commune aux entités : date et auteur de la création et de la dernière modification,
 * renseignés automatiquement par Spring Data ({@code AuditConfig}) ; sans setter, ils ne peuvent
 * pas être modifiés par le code applicatif.
 * <p>
 * Les horodatages sont des instants UTC ; l'auteur est l'email du jeton de l'appelant, ou son
 * identifiant {@code sub} à défaut. Il est null pour les lignes antérieures à l'audit.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
public abstract class EntiteAuditee {

	@CreatedDate
	@Column(name = "cree_le", nullable = false, updatable = false)
	private Instant creeLe;

	@CreatedBy
	@Column(name = "cree_par", updatable = false, length = 255)
	private String creePar;

	@LastModifiedDate
	@Column(name = "modifie_le", nullable = false)
	private Instant modifieLe;

	@LastModifiedBy
	@Column(name = "modifie_par", length = 255)
	private String modifiePar;

}
