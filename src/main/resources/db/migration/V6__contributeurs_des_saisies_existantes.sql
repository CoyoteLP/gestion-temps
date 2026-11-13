-- Projets et saisie de temps réservés aux membres du projet (nouveau rôle CONTRIBUTEUR, accepté par
-- la colonne membre_projet.role existante). Pour ne pas couper l'accès de ceux qui saisissaient
-- déjà, chaque utilisateur devient contributeur des projets sur lesquels il a des saisies et dont il
-- n'est pas encore membre. Les autres membres sont déclarés par l'administrateur.

insert into membre_projet (projet_id, utilisateur_id, role, cree_par, modifie_par)
select distinct t.projet_id, s.utilisateur_id, 'CONTRIBUTEUR', 'migration V6', 'migration V6'
from saisie_temps s
join tache t on t.id = s.tache_id
where not exists (
	select 1 from membre_projet m
	where m.projet_id = t.projet_id and m.utilisateur_id = s.utilisateur_id
);
