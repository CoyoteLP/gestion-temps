-- Audit : date et auteur (email du jeton, ou sub) de la création et de la dernière modification.
-- Les lignes existantes sont datées du passage de la migration, sans auteur connu.

alter table projet
	add column cree_le datetime(6) not null default current_timestamp(6),
	add column cree_par varchar(255),
	add column modifie_le datetime(6) not null default current_timestamp(6),
	add column modifie_par varchar(255);

alter table utilisateur
	add column cree_le datetime(6) not null default current_timestamp(6),
	add column cree_par varchar(255),
	add column modifie_le datetime(6) not null default current_timestamp(6),
	add column modifie_par varchar(255);

alter table tache
	add column cree_le datetime(6) not null default current_timestamp(6),
	add column cree_par varchar(255),
	add column modifie_le datetime(6) not null default current_timestamp(6),
	add column modifie_par varchar(255);

alter table saisie_temps
	add column cree_le datetime(6) not null default current_timestamp(6),
	add column cree_par varchar(255),
	add column modifie_le datetime(6) not null default current_timestamp(6),
	add column modifie_par varchar(255);

alter table membre_projet
	add column cree_le datetime(6) not null default current_timestamp(6),
	add column cree_par varchar(255),
	add column modifie_le datetime(6) not null default current_timestamp(6),
	add column modifie_par varchar(255);
