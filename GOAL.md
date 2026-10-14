# GOAL : idées game design pour VEEX FORCE

Constat : le jeu est dense (combos, cancels, esquive parfaite, 2 héros, 4 niveaux, succès, classement).
Ce qui manque surtout : une **boucle de rejouabilité** (une partie = 4 niveaux puis fin).
Principe : rétention par **maîtrise et fierté**, pas par culpabilité.

## Tier 1 : boucle « encore une partie » (priorité)

| Idée | Pourquoi ça accroche | Coût |
|---|---|---|
| ✅ **Mode Arcade Endless / Tower** : vagues infinies, difficulté qui monte, score seul rival | Classement mondial déjà là, raison de revenir | Faible, réutilise les arènes |
| **Run quotidienne (seed du jour)** : mêmes modificateurs pour tous, classement du jour | Rituel quotidien, comparaison sociale, 1 tentative = tension | Faible, Netlify Blobs déjà là |
| **Modificateurs de run** (cartouches arcade) : « Verre cassé » (1 PV, x3 score), « Dash infini », « Gravité lune », « Ennemis rapides » | Mêmes niveaux, expérience neuve, risque/récompense choisi | Moyen |
| ✅ **Rang S par niveau + médailles** (temps, sans dégâts, style) sur la carte des niveaux | Collection visible, « il me manque juste le S du niveau 3 » | Faible |

## Tier 2 : maîtrise et profondeur (flow)

- **Style meter qui compte vraiment** : SSS donne un bonus (Fury +, dégâts +) et pas seulement du score. Oblige à varier les coups, tue le spam.
- **Combo trial / dojo** : 10 défis scénarisés (« cancel + esquive parfaite + projection »). Enseigne la profondeur cachée (cancels, clinch) que la plupart des joueurs ratent.
- **Ghost de ta meilleure run** (replay semi-transparent) : concurrence contre soi-même, sans serveur.
- **Parry / contre à timing serré, récompensé** : petite fenêtre, son signature, hit-stop massif. Skill expression = fierté.

## Tier 3 : méta-progression légère (sans grind toxique)

- **Cassettes / mixtapes débloquables** : musiques alternatives, skins couleur (néon rose, chrome), cadres de portrait. Cosmétique uniquement, jamais de puissance.
- **Héros 3 débloquable** (critère maîtrise : S au niveau 2, ou fin sans mourir). Archétype manquant : **grappler lent / contre-attaquant** (le clinch roi) ou **zoneur à projectiles**. Triangle poids lourd / rush / grab.
- **Mode Boss Rush** : 4 boss enchaînés, PV partagés. Contenu déjà fait, énorme valeur de rejeu.
- **Fins alternatives** : fin normale vs fin « S partout » (moto + coucher de soleil + scène bonus). Chasse au 100 %.

## Tier 4 : twists de gameplay

- **Co-op local 2 joueurs** (VEEX + ROXY). Plus gros multiplicateur de partage d'un beat'em up. Clinch coordonné : un tient, l'autre frappe, combo duo.
- **Choix de route** entre zones (couloir risqué avec mini-boss vs arène calme avec bonus). Chaque run raconte une histoire différente.
- **Objets à risque** : mixtape « Fury x2 mais -PV max », pizza qui soigne mais ralentit. Décisions micro.
- **Événements aléatoires par arène** : coupure de lumière néon, pluie qui rend le sol glissant, foule qui lance des bouteilles. Casse la routine.

## Psychologie : leviers à utiliser (et garde-fou)

1. **Presque-victoire lisible** : l'écran game over montre « tu étais à 12 % du boss + 1 succès à X ». Donne la prochaine cible, pas de la frustration.
2. **Restart instantané** : 1 touche, 0 chargement. Friction nulle = « juste une de plus ».
3. **Feedback sur chaque palier** : son / animation quand une barre de succès, un rang ou une médaille bouge.
4. **Difficulté adaptative douce** : après 3 morts au même boss, ennemis -10 % d'agressivité, jamais annoncé.
5. **Pas de dark patterns** : pas de streak punitif, pas de FOMO d'événement limité, pas de monnaie premium. Les joueurs reviennent par plaisir, le bouche-à-oreille est meilleur.

## Ordre recommandé

1. Rang / médailles + écran résumé « presque » (petit, gros effet)
2. Run quotidienne avec seed + classement (infra déjà là)
3. Boss Rush + Endless (contenu recyclé)
4. Modificateurs de run
5. Héros 3 ou co-op (gros chantier, gros impact)

Points d'entrée code : `js/game.js` (HUD, écran résumé), `netlify/functions/scores.mjs` (classement du jour).
