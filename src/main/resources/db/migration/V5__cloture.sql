-- Clôture d'un mois pour un projet (mois représenté par son premier jour) : les saisies de ce mois
-- sur les tâches du projet ne peuvent plus être créées, modifiées ni supprimées.

create table cloture (
	id bigint not null auto_increment,
	version bigint not null default 0,
	projet_id bigint not null,
	mois date not null,
	cree_le datetime(6) not null default current_timestamp(6),
	cree_par varchar(255),
	modifie_le datetime(6) not null default current_timestamp(6),
	modifie_par varchar(255),
	primary key (id),
	constraint uk_cloture_projet_mois unique (projet_id, mois),
	constraint fk_cloture_projet foreign key (projet_id) references projet (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_uca1400_ai_ci;
