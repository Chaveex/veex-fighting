-- VEEXING FORCE - title logo, drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py).
-- 80s chrome lettering: blocky letters (bglib 5x7 font x6) with chamfered corners, a chrome gradient split by a horizon line
-- (white -> cyan | navy line | pink -> violet), dark outline, a 4 px magenta 3D extrusion, an italic shear, and a glint sweeping
-- across (8 frames; the last ones rest). Sprite 330x128, anchor (165, 0): the game centres it on the logo position.
WW, HH = 330, 128
dofile(app.params["lib"])
local out = app.params["out"]
local SC, SHEAR, EXT, BOLD = 6, 0.16, 4, 3   -- BOLD: extra px on the right of each cell (thicker strokes)

-- letter cells for one word, centred at (cx, y0)
local function cells(word, cx, y0)
  local tw = textW(word, SC); local x0 = math.floor(cx - tw / 2); local list = {}
  local ox = x0
  for i = 1, #word do
    local g = FONT[word:sub(i, i)]
    for gy = 1, 7 do for gx = 1, 5 do if g[gy]:sub(gx, gx) == "#" then
      local nb = function(dx, dy) local r = g[gy + dy]; return r and r:sub(gx + dx, gx + dx) == "#" end
      list[#list + 1] = { ox + (gx - 1) * SC, y0 + (gy - 1) * SC, nb(-1, 0), nb(1, 0), nb(0, -1), nb(0, 1) }
    end end end
    ox = ox + 6 * SC
  end
  return list
end
local WORDS = { { "VEEXING", 4 }, { "FORCE", 66 } }

local function mask()        -- filled letter pixels (before shear), with chamfered outer corners
  local m = {}
  for _, w in ipairs(WORDS) do
    for _, c in ipairs(cells(w[1], WW / 2 + 10, w[2])) do
      for dy = 0, SC - 1 do for dx = 0, SC - 1 + BOLD do
        local R = SC - 1 + BOLD
        local cut = (not c[3] and not c[5] and dx + dy < 1) or (not c[4] and not c[5] and (R - dx) + dy < 1)
                 or (not c[3] and not c[6] and dx + (SC - 1 - dy) < 1) or (not c[4] and not c[6] and (R - dx) + (SC - 1 - dy) < 1)
        if not cut then m[(c[2] + dy) * WW + c[1] + dx] = w[2] end   -- value = top of the WORD (gradient over the whole height)
      end end
    end
  end
  return m
end
local M = mask()
local function at(x, y) return M[y * WW + x] end
local function sheared(x, y) return math.floor(x + (HH / 2 - y) * SHEAR + 0.5) end

local CHROME = { "#ffffff", "#e8faff", "#b8f0ff", "#7ae0ff", "#3ab8f0", "#1a5aa8" }       -- above the horizon line
local LOWER = { "#ff9ae0", "#ff5ac8", "#e02fb0", "#a0208a", "#6a1470" }                  -- below it
local function letterColour(x, y, top)
  local t = (y - top) / (7 * SC)
  if t < 0.48 then local i = math.min(#CHROME, 1 + math.floor(t / 0.48 * #CHROME)); return CHROME[i] end
  if t < 0.53 then return "#1a0a40" end
  local i = math.min(#LOWER, 1 + math.floor((t - 0.53) / 0.47 * #LOWER)); return LOWER[i]
end

local function frame(f)
  local im = newImg()
  -- extrusion (down-right), then outline, then the chrome face
  for k = EXT, 1, -1 do for key, top in pairs(M) do
    local x, y = key % WW, key // WW; px(im, sheared(x, y) + k, y + k, C(k == EXT and "#1a0420" or (k > 2 and "#4a0a50" or "#7a1470")))
  end end
  for key, top in pairs(M) do
    local x, y = key % WW, key // WW
    for _, d in ipairs({ { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 }, { -2, 0 }, { 0, -2 } }) do
      if not at(x + d[1], y + d[2]) then px(im, sheared(x + d[1], y + d[2]), y + d[2], C("#0a0414")) end
    end
  end
  for key, top in pairs(M) do
    local x, y = key % WW, key // WW
    local c = letterColour(x, y, top)
    if not at(x, y - 1) and (y - top) < 3 * SC then c = "#ffffff" end                       -- lit top edges
    px(im, sheared(x, y), y, C(c))
  end
  -- glint: a bright diagonal band sweeping left -> right (frames 0..4), then rest
  if f < 5 then
    local gx = -40 + f * 90
    for key, top in pairs(M) do
      local x, y = key % WW, key // WW; local d = (x + y * 0.6) - gx
      if d >= 0 and d < 10 then px(im, sheared(x, y), y, C(d < 3 and "#ffffff" or "#d8ffff")) end
    end
  end
  -- star sparkle on the top-right of the first word
  if f >= 2 and f <= 4 then
    local sx, sy = WW - 52, 6; local s = (f == 3) and 4 or 2
    px(im, sx, sy, C("#ffffff")); for d = 1, s do local a = d == s and 150 or 255; px(im, sx + d, sy, C("#ffffff", a)); px(im, sx - d, sy, C("#ffffff", a)); px(im, sx, sy + d, C("#ffffff", a)); px(im, sx, sy - d, C("#ffffff", a)) end
  end
  return im
end

local spr = Sprite(WW, HH, ColorMode.RGB)
spr.filename = out
spr.layers[1].name = "logo"
for i = 2, 8 do spr:newEmptyFrame() end
for f = 1, 8 do spr.frames[f].duration = (f <= 5) and 0.06 or 0.8; spr:newCel(spr.layers[1], spr.frames[f], frame(f - 1), Point(0, 0)) end
local t = spr:newTag(1, 8); t.name = "logo"
spr:saveAs(out)
print("logo: 8 frames -> " .. out)
