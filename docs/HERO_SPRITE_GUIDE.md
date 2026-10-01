# VEEX — guide pixel art du héros (Aseprite)

Héros v8 **d'après la photo** `public/veex.png` : mulet prononcé qui s'arrête aux épaules, volume relevé sur le dessus, front dégagé, sourcils épais,
moustache discrète claire, barbe de 3 jours ; veste en jean stone-wash à manches longues et col relevé, ouverte sur un t-shirt blanc à col rond rouge
rayé rouge/bleu ; jean brut foncé (lisible contre la veste) aux ourlets roulés, baskets montantes, poings bandés. Ambiance 80s/90s décontractée.
**v9 : pixel art 2D dessiné** par `tools/hero_pixel.py` (plus de rendu 3D). La tête et le mulet sont des cartes de pixels faites main (`HEAD_SIDE`, `HEAD_FRONT`, `HEAD_BACK`, `MULLET` : une lettre = un pixel, légende en tête du fichier) : retouche le visage directement là. Les membres sont des capsules en ombrage cel 4 tons, le torse = veste ouverte sur le t-shirt rayé. Seules les positions des articulations viennent de `tools/hero_anim.py`. Aperçu rapide : `python tools/hero_pixel.py idle_0 jab_s0` -> `tools/pixel_preview.png`.
Style retenu : **B – Arcade 16-bit net** (héros ~90 px, tête en 3/4 vers le spectateur, corps de profil, vue tournée vers la droite — le jeu retourne le sprite vers la gauche).

## 0. Démarrage rapide

```
python tools/make_hero_palette.py      # palette VEEX tirée des dégradés réels du sprite -> assets/palette/veex.gpl (76 couleurs)
python tools/make_hero_workspace.py    # atelier Aseprite prêt à dessiner               -> assets/hero_workspace.aseprite
# ... tu dessines / retouches dans Aseprite ...
python tools/import_hero_sheet.py      # exporte la planche + met le jeu à jour (recharge la page)
python tools/make_hero_sprites.py      # OU : régénère tout le héros (dessin : tools/hero_pixel.py, poses : tools/hero_anim.py)
```

`assets/hero_workspace.aseprite` : canvas **128×128**, grille **16 px**, palette VEEX, **128 frames** dans l'ordre du jeu, **29 tags** avec durées,
repères de proportions, tranches `hurtbox` et `pivot`, 11 calques dont une référence 3D verrouillée.

## 1. Format

| | |
|---|---|
| Canvas | 128 × 128 px (RGBA pendant le dessin, conversion indexée à la fin par Aseprite) |
| Hauteur du héros | ~90 px (tête ≈ 18×26 px) ; le jeu agrandit les hitbox dans la même proportion (`PU` dans `js/util.js`) |
| Pivot | (64, 118) : centre des pieds. Le sol est la ligne magenta (y = 118) |
| Style | pixel art net : aplats, 4 tons par masse, contours sélectifs, liseré néon |
| Éclairage | lumière chaude en haut à droite/devant, **liseré cyan** côté dos, touche magenta bas-avant |

Repères (lignes cyan pointillées) : sommet du crâne y=26 · menton y=57 · épaules y=64 · hanches y=84 · genoux y=94 · sol y=118.

## 2. Palette — `assets/palette/veex.gpl`, détail dans `docs/HERO_PALETTE.md`

14 familles × 5 tons (reflet → profond) + néons + contours : peau, cheveux bruns, barbe, iris, veste en jean, jean clair, t-shirt (blanc / rouge / bleu), baskets, semelle, cuir, or, ombre.
Règle : **lumières vers le chaud, ombres vers le violet** ; jamais de noir pur.

## 3. Animations (v7, toutes celles du jeu) — 128 frames

Un tag Aseprite = une animation ; les frames s'appellent `<tag>_<clé>`.

| Tag | Frames | Contenu |
|---|---|---|
| `idle` | 8 | garde thaï haute, rebond rythmé, pied avant qui tape, poings en retard d'un demi-temps |
| `walk` | 8 | avancée en garde : contact / descente / passage / montée ×2, bassin qui monte et descend, buste en contre-rotation |
| `crouch` | 3 | `crouch_in` (transition) + 2 frames de maintien |
| `jump` / `land` | 5 / 2 | impulsion, repli, apogée, ouverture, réception ; écrasement à l'atterrissage |
| `dash` / `airdash` | 3 / 2 | poussée, glisse bras en arrière, freinage ; superman aérien |
| `hurt` `tumble` `down` `getup` | 3 / 2 / 2 / 4 | impact tête en arrière, recul, reprise ; projection ; choc au sol, allongé ; assis → genou → debout |
| `fury` `spin` `fury_end` | 3 / 8 / 3 | Fury : concentration, cri bras ouverts, vrille 8 angles bras tendus, frappe des deux poings au sol |
| `jab` `cross` | 4 / 5 | direct avant (épaule qui couvre le menton, pas avant) · direct arrière (hanche puis épaule, talon qui pivote) |
| `elbow` | 8 | coude retourné : pas croisé, dos au joueur, la tête repère la cible en premier, coude qui balaie le visage |
| `teep` `round` `knee` | 5 / 7 / 5 | push-kick · roundhouse jambe arrière (pivot, bras qui balance) · genou en clinch (tirer + hanches en avant) |
| `upper` `low` `rknee` | 5 / 5 / 4 | accroupi : uppercut · balayage · genou remontant (launcher) |
| `airp` `airk` `airknee` | 4 ×3 | jab aérien · dive kick · genou volant |
| `rushp` `rushk` `rushn` | 4 ×3 | après un dash : crochet large · coup de pied sauté · genou volant |

Chaque frame a une **phase** : `l` boucle, `w` préparation, `s` impact, `r` retour. Le jeu répartit les frames de chaque phase sur le timing
réel du coup (`st` / `ac` / `rc` dans `js/fighter.js`) : changer le timing d'un coup ne demande pas de refaire le sprite.
La table (noms, poids, phases) voyage dans `meta.anims` du JSON (`js/sprites.js`, `HeroSprites.frameFor`) : **ne renomme pas et ne réordonne pas les frames**.

## 4. Calques (du bas vers le haut)

`OMBRE_SOL` · `BRAS_ARRIERE` · `JAMBE_ARRIERE` · `TORSE` · `TETE` · `JAMBE_AVANT` · `BRAS_AVANT` · `OMBRAGE` · `LISERE_NEON` · `GUIDES` · `REF_3D`
(`GUIDES` et `REF_3D` sont verrouillés et **jamais exportés** ; `OMBRE_SOL` non plus).
`REF_3D` = la frame 3D générée, à 35 % d'opacité : décalque-la ou corrige-la. Tu peux tout dessiner sur un seul calque.

## 5. Modifier les poses (sans dessiner)

L'animation est une donnée : `tools/hero_anim.py`. Les cibles (mains `nh`/`fh`, pieds `nf`/`ff`) et les pôles (coudes `ne`/`fe`, genoux `nk`/`fk`)
sont en **espace écran** (x vers l'ennemi, y vers le haut, z vers la caméra) ; `yb` tourne le bassin, `twist` le buste, `yh` la tête.
Exemple, allonger le jab : dans `moves()`, changer `nh=(35, 53, 5)` de `js` (frame d'impact). Puis `python tools/hero_anim_preview.py jab cross elbow`
pour voir le résultat, et `python tools/make_hero_sprites.py` pour régénérer la planche + le jeu.

## 6. Script Lua

`tools/ase/hero_workspace.lua` reconstruit l'atelier (palette, grille, frames, tags, calques, guides, slices, référence). Ligne de commande :
`aseprite -b --script-param root=F:/Dev/Claude/VeexingForce --script tools/ase/hero_workspace.lua`
(il lit `assets/hero_spec.json`, régénéré par `python tools/make_hero_workspace.py`). Dans l'éditeur : *File → Scripts → Open Scripts Folder*, copie le fichier, puis *File → Scripts → hero_workspace*.

## 7. Intégration dans le jeu

```
python tools/import_hero_sheet.py               # exporte avec Aseprite, vérifie que les frames sont dessinées, sauvegarde l'ancienne planche
python tools/import_hero_sheet.py --force       # importe même si certaines frames sont encore vides
```
L'import ignore `REF_3D`, `GUIDES` et `OMBRE_SOL`, refuse d'écraser le héros par une planche vide et sauvegarde l'ancienne planche dans `assets/hero_3d_backup.png`.
Puis `npm run dev` (ou recharge la page), et `npm run deploy` pour Netlify.
