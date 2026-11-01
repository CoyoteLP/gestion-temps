-- Schéma initial : projets, tâches, utilisateurs et saisies de temps (MariaDB 11.4).
-- Ne jamais modifier un script déjà appliqué : toute évolution passe par un nouveau script V<n>__description.sql.

create table projet (
	id bigint not null auto_increment,
	code varchar(20) not null,
	nom varchar(100) not null,
	description varchar(1000),
	date_debut date,
	date_fin date,
	actif bit not null,
	primary key (id),
	constraint uk_projet_code unique (code)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;

create table utilisateur (
	id bigint not null auto_increment,
	email varchar(150) not null,
	nom varchar(100) not null,
	prenom varchar(100) not null,
	actif bit not null,
	primary key (id),
	constraint uk_utilisateur_email unique (email)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;

create table tache (
	id bigint not null auto_increment,
	projet_id bigint not null,
	libelle varchar(100) not null,
	description varchar(1000),
	actif bit not null,
	primary key (id),
	constraint fk_tache_projet foreign key (projet_id) references projet (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;

create table saisie_temps (
	id bigint not null auto_increment,
	utilisateur_id bigint not null,
	tache_id bigint not null,
	jour date not null,
	duree decimal(4,2) not null,
	commentaire varchar(500),
	primary key (id),
	constraint fk_saisie_temps_utilisateur foreign key (utilisateur_id) references utilisateur (id),
	constraint fk_saisie_temps_tache foreign key (tache_id) references tache (id),
	-- Total journalier et recherche par utilisateur et période ; sert aussi d'index à la clé étrangère utilisateur_id
	index idx_saisie_temps_utilisateur_jour (utilisateur_id, jour)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;
