-- Authentification OIDC : identifiant du compte chez le fournisseur (revendication sub), rattaché
-- à la première connexion. Membres d'un projet avec leur rôle (MANAGER, BACKUP).

alter table utilisateur add column sujet varchar(255);
alter table utilisateur add constraint uk_utilisateur_sujet unique (sujet);

create table membre_projet (
	id bigint not null auto_increment,
	version bigint not null default 0,
	projet_id bigint not null,
	utilisateur_id bigint not null,
	role varchar(20) not null,
	primary key (id),
	constraint uk_membre_projet_projet_utilisateur unique (projet_id, utilisateur_id),
	constraint fk_membre_projet_projet foreign key (projet_id) references projet (id),
	constraint fk_membre_projet_utilisateur foreign key (utilisateur_id) references utilisateur (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;
