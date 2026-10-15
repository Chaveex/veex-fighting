-- VEEXING FORCE - INTRO backdrop "MEGA MARKET", drawn pixel by pixel in Aseprite (batch, see tools/make_intro.py).
-- A single static 640x360 supermarket aisle: fluorescent ceiling, shelves stacked with boxes / cans / bottles, a neon sign, a freezer,
-- pastel checker floor in perspective. Layers: back (everything) | glow (additive: tubes, sign, freezer).
local out = app.params["out"]
local metaOut = app.params["meta"]
WW, HH = 640, 360
dofile(app.params["lib"])
seed = 4242

local CEIL = 64        -- ceiling / wall boundary
local FLOOR = 236      -- wall base: floor starts here
local BACK, GLOW = newImg(), {}

-- ---- wall: pastel mint tiles up to the ceiling, with a pink dado stripe
for y = 0, FLOOR - 1 do for x = 0, WW - 1 do
  local c
  if y < CEIL then c = (y < 8) and "#3a2a5a" or "#4a3670"
    if y >= CEIL - 4 then c = "#2a1e46" end
  else
    c = "#2e2a52"
    if y % 12 == 0 or x % 24 == 0 then c = "#26224a" end
    if dith(x, y, 0.15) then c = "#383462" end
  end
  px(BACK, x, y, C(c))
end end
hline(BACK, 0, WW - 1, CEIL, C("#ff2fd0")); hline(BACK, 0, WW - 1, CEIL + 1, C("#ff9ae8"))

-- ---- ceiling fluorescent strips (+ halo)
for x = 30, WW - 60, 150 do
  rect(BACK, x, 22, x + 86, 28, C("#1a1230")); rect(BACK, x + 2, 23, x + 84, 27, C("#e8fcff")); hline(BACK, x + 2, x + 84, 23, C("#ffffff"))
  for dx = 0, 86, 3 do emit(GLOW, x + dx, 26, "#bff4ff", 0.20, 9) end
  cone(GLOW, x + 43, 28, FLOOR - 10, 24, 80, "#cfeeff", 0.10)
end

-- ---- shelf unit
local function product(x, y, w, h, kind)
  local pal = { { "#ff2fd0", "#ffb0e8" }, { "#27f0ff", "#c0fbff" }, { "#ffe44d", "#fff4a0" }, { "#3dffa0", "#b8ffe0" }, { "#ff6a3d", "#ffc0a0" }, { "#8b5cff", "#d0c0ff" }, { "#f4f0ff", "#ffffff" }, { "#e8323c", "#ff9a9a" } }
  local p = pick(pal)
  if kind == 1 then   -- box
    rect(BACK, x, y, x + w - 1, y + h - 1, C(p[1])); vline(BACK, x, y, y + h - 1, C(p[2])); hline(BACK, x, x + w - 1, y, C(p[2]))
    rect(BACK, x + 1, y + h // 2 - 1, x + w - 2, y + h // 2 + 1, C("#f4f0ff")); px(BACK, x + w - 1, y + h - 1, C("#14091f"))
    hline(BACK, x, x + w - 1, y + h - 1, C("#2a1840"))
  elseif kind == 2 then   -- can
    rect(BACK, x, y + 1, x + w - 1, y + h - 1, C(p[1])); hline(BACK, x, x + w - 1, y, C("#c8c8d8")); hline(BACK, x, x + w - 1, y + h - 1, C("#8a8aa0"))
    vline(BACK, x + 1, y + 2, y + h - 3, C(p[2])); rect(BACK, x + 1, y + h // 2 - 1, x + w - 2, y + h // 2, C("#f4f0ff"))
  else   -- bottle
    local nx = x + w // 2
    rect(BACK, x, y + 4, x + w - 1, y + h - 1, C(p[1])); vline(BACK, x + 1, y + 5, y + h - 2, C(p[2]))
    rect(BACK, nx - 1, y, nx, y + 3, C(p[1])); px(BACK, nx - 1, y, C("#f4f0ff")); px(BACK, nx, y, C("#f4f0ff"))
    rect(BACK, x + 1, y + h - 8, x + w - 2, y + h - 4, C("#f4f0ff"))
  end
end
local function shelfUnit(x0, x1, rows, top, rowH)
  rect(BACK, x0 - 2, top - 4, x0 - 1, top + rows * rowH + 2, C("#7a7fa8"))
  rect(BACK, x1 + 1, top - 4, x1 + 2, top + rows * rowH + 2, C("#7a7fa8"))
  rect(BACK, x0, top - 4, x1, top + rows * rowH, C("#1c1838"))
  for r = 0, rows - 1 do
    local sy = top + (r + 1) * rowH
    local x = x0 + 2
    while x < x1 - 8 do
      local kind = ri(1, 3); local w = (kind == 1) and ri(8, 13) or ri(5, 7); local h = ri(rowH - 14, rowH - 5)
      if rnd() < 0.08 then x = x + ri(4, 9) else product(x, sy - h, w, h, kind); x = x + w + 1 end
    end
    rect(BACK, x0, sy, x1, sy + 2, C("#c8cce8")); hline(BACK, x0, x1, sy + 3, C("#4a4a78"))
    for tx = x0 + 6, x1 - 10, 24 do rect(BACK, tx, sy + 1, tx + 8, sy + 2, (rnd() < 0.5) and C("#ffe44d") or C("#ff2fd0")) end   -- price tag strip
  end
  rect(BACK, x0 - 2, top + rows * rowH + 3, x1 + 2, top + rows * rowH + 5, C("#3a3a64"))
end
shelfUnit(10, 200, 4, 88, 36)
shelfUnit(214, 404, 4, 88, 36)
shelfUnit(486, 630, 4, 88, 36)

-- ---- freezer (right-centre gap): cyan glow, frosty doors
local fx0, fx1 = 410, 480
rect(BACK, fx0, 90, fx1, FLOOR - 1, C("#1a1a38"))
for i = 0, 1 do
  local dx = fx0 + 3 + i * 34
  rect(BACK, dx, 94, dx + 30, FLOOR - 6, C("#bff4ff")); rect(BACK, dx + 2, 96, dx + 28, FLOOR - 8, C("#6adcf0"))
  for y = 100, FLOOR - 14, 8 do for x = dx + 4, dx + 26 do if dith(x, y, 0.35) then px(BACK, x, y, C("#e8fcff")) end end end
  for k = 1, 5 do product(dx + 3 + (k - 1) * 5, 120 + (k % 2) * 40, 4, 12, 1) end
  vline(BACK, dx + 29, 130, 170, C("#ffffff"))
end
for y = 96, FLOOR - 10, 4 do emit(GLOW, fx0 + 35, y, "#27f0ff", 0.30, 20) end

-- ---- neon sign above everything
neonText(BACK, GLOW, "MEGA MARKET", 214, 32, 3, "#ff2fd0", "#ffffff", 0.35, false)
rect(BACK, 208, 28, 208, 56, C("#27f0ff")); rect(BACK, 210, 28, 210, 56, C("#27f0ff"))
rect(BACK, 424, 28, 424, 56, C("#27f0ff")); rect(BACK, 426, 28, 426, 56, C("#27f0ff"))
-- hanging promo flags
for x = 20, 190, 14 do
  rect(BACK, x, 44, x + 9, 52, C(((x // 14) % 2 == 0) and "#ffe44d" or "#3dffa0")); px(BACK, x + 4, 53, C("#2a1840")); hline(BACK, x, x + 9, 44, C("#14091f"))
end
for x = 450, 620, 14 do
  rect(BACK, x, 44, x + 9, 52, C(((x // 14) % 2 == 0) and "#ff6a3d" or "#27f0ff")); px(BACK, x + 4, 53, C("#2a1840")); hline(BACK, x, x + 9, 44, C("#14091f"))
end
-- aisle numbers on little lollipop signs
for i, x in ipairs({ 104, 308, 556 }) do
  rect(BACK, x - 1, 66, x, 80, C("#8a8aa8")); rect(BACK, x - 12, 72, x + 11, 85, C("#14091f")); rect(BACK, x - 11, 73, x + 10, 84, C("#ffe44d"))
  neonText(BACK, nil, tostring(i + 2), x - 3, 74, 1, "#14091f", "#14091f", 0, false)
end

-- ---- floor: pastel checker in perspective + sheen
for y = FLOOR, HH - 1 do
  local t = (y - FLOOR) / (HH - FLOOR)
  local th = 8 + math.floor(t * 18)          -- row height grows toward the camera
  local row = math.floor((y - FLOOR) / th)
  for x = 0, WW - 1 do
    local cx = x - 320; local tw = math.floor(th * 2.6)
    local col = math.floor((cx + 100000) / tw)
    local c = ((col + row) % 2 == 0) and "#f0e8ff" or "#b8a8e0"
    if (y - FLOOR) % th == 0 then c = "#8a78c0" end
    if (cx + 100000) % tw == 0 then c = "#8a78c0" end
    if c ~= "#8a78c0" and t > 0.55 and ((col + row) % 2 == 1) then c = "#a898d4" end   -- darker toward the camera
    px(BACK, x, y, C(c))
  end
end
hline(BACK, 0, WW - 1, FLOOR, C("#14091f")); hline(BACK, 0, WW - 1, FLOOR + 1, C("#5a4a90"))
-- baseboard + shelf shadows on the floor
rect(BACK, 0, FLOOR - 5, WW - 1, FLOOR - 1, C("#1a1230"))
-- reflections of the fluorescent light on the tiles
for x = 60, WW - 40, 150 do for y = FLOOR + 8, FLOOR + 50, 6 do emit(GLOW, x + 43, y, "#ffffff", 0.03, 14) end end

-- ================================================================== save
local glow = bake(GLOW, nil, 1.6)
local spr = saveLayers(out, { { "back", BACK }, { "glow", glow } }, { glow = true })
if metaOut then
  local f = io.open(metaOut, "w"); f:write(string.format('{"width":%d,"height":%d,"floor":%d}', WW, HH, FLOOR)); f:close()
end
print("intro: " .. #spr.layers .. " layers -> " .. out)
