-- Verrouillage optimiste : numéro de version de chaque ligne, incrémenté par Hibernate à chaque modification.

alter table projet add column version bigint not null default 0;
alter table utilisateur add column version bigint not null default 0;
alter table tache add column version bigint not null default 0;
alter table saisie_temps add column version bigint not null default 0;
