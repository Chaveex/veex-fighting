# VEEXING FORCE

Beat'em all 2D scrolling, style 80s néo-rétro. HTML5 Canvas, zéro dépendance, zéro build.
Héros = la tête de `public/veex.png` sur un squelette animé (IK) en boxe thaï.

## Lancer

Double-clic sur `index.html` (Edge / Chrome / Firefox). Manette supportée (avec vibrations).

## Héros

Deux héros jouables, même boxe thaï, même moveset : **VEEX** (le mullet) et **ROXY** (la tornade : queue de cheval, coupe-vent turquoise, jambières).
Choix sur l'écran titre avec **← / →** (mémorisé). `?hero=roxy` pour forcer en dev.

## Contrôles

| Action | Clavier | Manette |
|---|---|---|
| Bouger (profondeur = haut/bas) | WASD / ZQSD / flèches | stick / croix |
| Poing (jab → direct → coude) | J | X |
| Pied (teep → low/roundhouse → head kick) | K | Y |
| Genou (genou → genou → double genou) | L | B |
| Saut | Espace | A |
| Dash (sol **et air**, 8 directions) | Shift | RB / RT |
| Se baisser (esquive les coups hauts) | C | LB / LT |
| Fury (jauge pleine) | R | L3 / R3 |
| Pause / son / plein écran | Échap / M / F | Start |

Combos libres : enchaîne J/K/L dans n'importe quel ordre (3 coups max, le 3e est un finisher critique).
Accroupi : J uppercut, K low kick (balayage), L genou remontant (launcher → jongle en l'air avec un saut).
En l'air : J jab aérien, K dive kick, L genou volant. Pendant un dash : rush hook / rush kick / rush knee.

## Cancels et maîtrise

- **Cancel** : un coup qui touche (ou la fin de sa récupération) peut être annulé par un **dash** ou un **saut**.
  Un cancel garde le combo, rend une demi-charge de dash, et donne +25 % de dégâts au coup suivant.
- **Esquive parfaite** : dash au moment de l'impact (11 frames d'invincibilité) = ralenti, dash rechargés, jauge Fury.
- **Contre** (frapper pendant leur préparation) = coup critique. **Renvoie** les projectiles en les frappant.
- Les ennemis lourds encaissent les coups légers pendant leurs attaques ; les boss ont une jauge de poise (STAGGER).
- Coups hauts : baisse-toi. Coups bas et ondes de choc : saute ou dash.

## Juice

Hit-stop, ralentis sur critiques/KO, screen shake directionnel, zoom punch, aberration chromatique,
bloom, scanlines, particules néon, afterimages de dash, wall splat, rang de style D → SSS, audio 100 % synthétisé
(musique synthwave différente par niveau + variante boss).

## Bouches d'égout à vapeur

Cycle : repos → **alerte** (couvercle qui tremble, lueur orange, filets de vapeur) → **jet** (dégâts + projection au sol) → refroidissement.
Ça touche le héros **et** les ennemis qui sont dessus. Saute par-dessus, dash à travers (esquive parfaite) ou pousse les ennemis dessus.
Placement : 2 / 3 / 4 / 4 bouches par niveau, uniquement dans les arènes de combat (jamais dans les couloirs, jamais dans l'arène du boss 4), sur les voies du haut ou du bas. Le cycle ne tourne que lorsqu'elles sont à l'écran et démarre après un délai calme (~6 s).
Asset : `assets/vent.aseprite` (vrai fichier Aseprite, 2 calques `base`/`steam`, tags `off` `warn` `burst` `active` `cool`).

## Éléments de niveau (2 signatures par niveau)

| Niveau | Décor destructible | Mécanique |
|---|---|---|
| 1 Neon Downtown | **Poubelles** : 3 coups, laissent soda / pizza / mixtape | **Bouche d'incendie** : un coup l'ouvre, le jet projette les ennemis (contre le mur = splat). Refrappe-la de l'autre côté pour réorienter le jet |
| 2 Galaxy Arcade | **Bornes d'arcade** : explosent en arc électrique (dégâts autour) et lâchent une mixtape Fury | **Bumpers** : renvoient les ennemis projetés (dégâts) et **ton dash** (rend une charge : enchaîne-les) |
| 3 Sunset Boulevard | **Cabriolet rose** : 8 coups, prend feu à la fin, **explosion géante** (attention à toi aussi) | **Ballon de plage** : un coup et il rebondit en perçant les ennemis ; refrappe-le pour le relancer |
| 4 Cyber Tower | **Serveurs** : détruits, ils lancent une **EMP** qui étourdit tous les ennemis à l'écran | **Tapis roulants** : ils entraînent héros et ennemis |

Les ennemis projetés qui percutent poubelles, bornes, cabriolets et serveurs les abîment aussi. Assets : `assets/props/*.aseprite` (calques, tags d'animation, un fichier par élément).
`node tools/soak.js` avec `PROPS=1` lance un test de comportement de chaque élément.

## Dessiner le héros à la main (Aseprite)

`assets/hero_workspace.aseprite` est un atelier prêt à l'emploi (128 frames, 29 tags, palette VEEX, guides, référence 3D). Guide complet : [`docs/HERO_SPRITE_GUIDE.md`](docs/HERO_SPRITE_GUIDE.md).
`npm run hero:workspace` le reconstruit, `npm run hero:import` réintègre ta planche dans le jeu.

## Niveaux

1. NEON DOWNTOWN (boss BIG BOOMER) 2. GALAXY ARCADE (LADY LASER) 3. SUNSET BOULEVARD (DON PASTEL) 4. CYBER TOWER (MR. CHROME)

## Dev

- `?level=3` démarre au niveau 3, `&stop=2` saute à la 3e zone, `&bot=1` autoplay, `&god=1` invincible, `?sheet=1` planche de poses.
- `node tools/soak.js <niveau> <stop|-1> <steps>` : test de logique sans navigateur (bot, `NOGOD=1` pour mourir).
- `python tools/make_prop_sprites.py` régénère les 8 éléments de niveau (`assets/props/`, `js/propSprites.js`) ; `tools/asekit.py` écrit les vrais fichiers `.aseprite`.
- `python tools/make_vent_sprites.py` régénère la bouche d'égout (`assets/vent.aseprite|png|json`, `js/ventSprites.js`).
- `python tools/build_enemy_sheets.py` : les 24 ennemis / boss sont des **modèles 3D rendus en pixel art** (même moteur que le héros : `tools/enemy3d.py`, `render3d.py`), finis par le vrai Aseprite (`assets/enemies/*.aseprite|png|json`, `js/enemySprites.js`). `tools/make_enemy_sprites.py` ne sert plus que de bibliothèque (roster, poses).
- `python tools/make_hero_sprites.py roxy` : même pipeline pour la 2e héroïne (look `roxy` de `tools/hero6.py` : palette + coiffure / tenue / silhouette), sorties `assets/hero_roxy.*` et `js/heroSprites_roxy.js` (portrait pixel inclus). Les deux héros partagent l'animation `tools/hero_anim.py`.
- `python tools/make_hero_sprites.py` (v7) : le héros est conçu **d'après la description** (plus de photo) : modèle 3D à squelette complet (`tools/hero6.py`, IK 3D, torsion du buste, vraie vrille) rendu en pixel art (`render3d.py`). L'**animation v7** (réécrite de zéro) est dans `tools/hero_anim.py` : cibles en espace écran, frames par phase (préparation / impact / retour), table exportée dans le JSON et lue par `HeroSprites.frameFor` (`python tools/hero_anim_preview.py jab cross elbow` pour les voir, `all` pour tout). Frames → `assets/hero_src.aseprite` (calques `body` + `rim`), puis **le vrai Aseprite** (`tools/ase/hero_finalize.lua`) → `assets/hero.aseprite` indexé, `hero.png` + JSON, GIF d'aperçu (`assets/hero_preview/`). `hero3d.py` (version photo) n'est plus utilisé que par les ennemis (helpers) et le comparatif de styles.
- Échelle : `PU` (héros, 1.26) et `EU` (ennemis, 1.22) dans `js/util.js` agrandissent sprites, hitboxes, portées et vitesses ; ils doivent rester égaux à `k` des générateurs (`UNIT` / `EU`).
- `python tools/make_assets.py` régénère `js/assets.js` (tête + portrait embarqués) depuis `public/veex.png`.
- Structure : `js/util` (input, math) · `audio` · `fx` (juice) · `rig` (squelette) · `fighter` (héros + moves) · `enemies` (IA, boss, projectiles) · `levels` (niveaux, décors) · `game` (boucle, HUD, menus).
