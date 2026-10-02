-- VEEXING FORCE - enemy projectiles + MR. CHROME's floor laser, drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py).
-- Sprite 64x48, anchor (32, 24) = centre. One tag per kind, facing RIGHT (the game mirrors them):
--   disc   (DJ VINYL's records, 8 frames: spinning, the specular arc turns)    case  (DON PASTEL's briefcase, 8 frames: tumbling)
--   ring   (LADY LASER's energy rings, 4 frames: pulsing)                      sonic (BIG BOOMER's sound waves, 4 frames)
--   wave   (ground shockwave, 4 frames: the crest rolls)                       bolt  (CYBER energy bolt, 2 frames: flicker)
--   beamwarn / beamfire (floor laser tiles, 32 px wide, tiled across the screen: red warning strip, cyan beam; 4 frames each)
-- ring / sonic / wave / bolt / beam* are light: the game draws them ADDITIVELY.
WW, HH = 64, 48
dofile(app.params["lib"])
local out = app.params["out"]
seed = 777
local CX, CY = 32, 24
local OUT = "#12081e"

local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r - 1), math.ceil(cy + r + 1) do for x = math.floor(cx - r - 1), math.ceil(cx + r + 1) do
    local d = math.sqrt((x + 0.5 - cx) ^ 2 + (y + 0.5 - cy) ^ 2); if d <= r then local c = colf(x, y, d / r); if c then px(im, x, y, C(c)) end end
  end end
end
local function ellipseRing(im, cx, cy, rx, ry, th, col)
  for y = math.floor(cy - ry - th), math.ceil(cy + ry + th) do for x = math.floor(cx - rx - th), math.ceil(cx + rx + th) do
    local d = math.sqrt(((x + 0.5 - cx) / rx) ^ 2 + ((y + 0.5 - cy) / ry) ^ 2)
    if math.abs(d - 1) * math.min(rx, ry) <= th / 2 then px(im, x, y, C(col)) end
  end end
end

local frames = {}   -- { tag, image }
local function add(tag, im) frames[#frames + 1] = { tag, im } end

-- ---- disc: vinyl record (grooves, pink label, rotating highlight) ----
for f = 0, 7 do
  local im = newImg()
  disc(im, CX, CY, 9, function(x, y, d)
    if d > 0.92 then return OUT end
    if d < 0.30 then return d < 0.12 and "#ffe0f6" or ((x + y) % 3 == 0 and "#ff8ae0" or "#ff2fd0") end
    if d < 0.36 then return "#2a1a3a" end
    local ring = math.floor(d * 14) % 2 == 0
    return ring and "#1c1028" or "#2e2048"
  end)
  local a = f / 8 * math.pi * 2
  for k = -5, 5 do local t = a + k * 0.09; for _, r in ipairs({ 6.5, 7.5 }) do px(im, math.floor(CX + math.cos(t) * r), math.floor(CY + math.sin(t) * r), C(math.abs(k) < 3 and "#ffffff" or "#8a7aaa")) end end
  px(im, CX + math.floor(math.cos(a + math.pi) * 4), CY + math.floor(math.sin(a + math.pi) * 4), C("#6a5a8a"))
  add("disc", im)
end
-- ---- case: leather briefcase tumbling (rotated rectangle sampled per pixel) ----
for f = 0, 7 do
  local im = newImg(); local a = f / 8 * math.pi * 2; local ca, sa = math.cos(a), math.sin(a)
  for y = CY - 12, CY + 12 do for x = CX - 12, CX + 12 do
    local dx, dy = x + 0.5 - CX, y + 0.5 - CY; local u, v = dx * ca + dy * sa, -dx * sa + dy * ca
    local c = nil
    if math.abs(u) <= 8.5 and math.abs(v) <= 6.5 then
      c = (math.abs(u) > 7.5 or math.abs(v) > 5.5) and OUT or ((v < -3.5) and "#a8703a" or "#7a4b22")
      if math.abs(v + 1) < 0.6 and math.abs(u) < 7.5 then c = "#5a3416" end              -- lid seam
      if math.abs(u) < 1.5 and v > -2 and v < 1 then c = "#ffe44d" end                  -- clasp
      if math.abs(u - 5) < 1 and math.abs(v + 1) < 1 then c = "#ffd060" end; if math.abs(u + 5) < 1 and math.abs(v + 1) < 1 then c = "#ffd060" end
    elseif math.abs(u) <= 3.5 and v < -6.5 and v > -9 then
      c = (math.abs(u) > 2.4 or v < -8.2) and "#3a2210" or nil                          -- handle
    end
    if c then px(im, x, y, C(c)) end
  end end
  add("case", im)
end
-- ---- ring: energy ring (light) ----
for f = 0, 3 do
  local im = newImg(); local rx = 4 + math.sin(f / 4 * math.pi * 2) * 1.2
  ellipseRing(im, CX, CY, rx + 1, 10, 3, "#0a6a8a"); ellipseRing(im, CX, CY, rx + 1, 10, 2, "#27f0ff"); ellipseRing(im, CX, CY, rx + 1, 10, 0.9, "#ffffff")
  for k = 0, 3 do local t = (f * 0.8 + k * 1.57); px(im, math.floor(CX + math.cos(t) * (rx + 3)), math.floor(CY + math.sin(t) * 12), C("#9ff8ff")) end
  add("ring", im)
end
-- ---- sonic: three concentric sound arcs facing right (light) ----
for f = 0, 3 do
  local im = newImg()
  for i = 0, 2 do
    local r = 22 - i * 6 + f * 0.8; local ox = CX - 14; local col = i == 0 and "#ffffff" or (i == 1 and "#ff6ae0" or "#a0208a")   -- nested arcs, the front one biggest
    for a = -52, 52 do local t = math.rad(a); local x, y = math.floor(ox + math.cos(t) * r), math.floor(CY + math.sin(t) * r)
      px(im, x, y, C(col)); if i < 2 then px(im, x - 1, y, C(i == 0 and "#ff9af0" or "#6a1060")) end end
  end
  add("sonic", im)
end
-- ---- wave: rolling ground shockwave facing right (light) ----
for f = 0, 3 do
  local im = newImg(); local hgt = 9 + ((f % 2 == 0) and 0 or 2)
  for x = CX - 26, CX + 14 do
    local t = (x - (CX - 26)) / 40
    local h = (x < CX + 6) and math.floor(t * t * hgt) or math.floor((CX + 14 - x) / 8 * hgt)
    for y = CY + 6 - h, CY + 6 do
      local c = (y == CY + 6 - h) and "#ffffff" or ((y < CY + 6 - h + 3) and "#ffe44d" or "#ff8a3a")
      if t < 0.55 and dith(x, y, 1 - t * 1.6) then c = nil end
      if c then px(im, x, y, C(c)) end
    end
  end
  for k = 0, 5 do local x = CX - 10 + k * 4 + f; px(im, x, CY + 6 - math.floor(hgt * 0.9) - ri(1, 4), C("#fff0a0")) end   -- dust flecks
  for x = CX - 30, CX - 8 do if (x + f) % 3 ~= 0 then px(im, x, CY + 7, C("#ff6a3d")) end end
  add("wave", im)
end
-- ---- bolt: energy bolt facing right (light) ----
for f = 0, 1 do
  local im = newImg()
  for x = CX - 14, CX + 7 do
    local t = (x - (CX - 14)) / 21; local th = t < 0.85 and math.floor(t * 2.5) or 1
    for y = CY - th, CY + th do px(im, x, y, C(math.abs(y - CY) < 1 and (t > 0.3 and "#ffffff" or "#9affd0") or "#3dffa0")) end
  end
  for k = 1, 4 do local x = CX - 12 + ri(0, 16); px(im, x, CY + ri(-4, 4), C(f == 0 and "#3dffa0" or "#ffffff")) end
  disc(im, CX + 7, CY, 2.5, function(x, y, d) return d < 0.5 and "#ffffff" or "#9affd0" end)
  add("bolt", im)
end
-- ---- floor laser tiles (32 px wide, centred on CY, tiled by the game) ----
for f = 0, 3 do   -- warning strip: red band, chevrons scrolling, edge lines
  local im = newImg()
  for x = 0, 31 do
    for y = CY - 10, CY + 10 do
      local c = nil
      if y == CY - 10 or y == CY + 10 then c = "#ff7088"
      elseif dith(x, y, 0.35) then c = "#a01030" end
      local cx = (x + f * 4) % 16
      if math.abs(y - CY) < 5 and cx >= math.abs(y - CY) and cx < math.abs(y - CY) + 3 then c = "#ff3a5a" end   -- chevron >
      if c then px(im, x, y, C(c)) end
    end
  end
  add("beamwarn", im)
end
for f = 0, 3 do   -- the beam: pink halo, cyan body, white core, turbulent edges
  local im = newImg()
  for x = 0, 31 do
    local wob = math.floor(math.sin((x + f * 8) * 0.4) * 1.5 + math.sin((x * 3 + f * 5) * 0.9) * 1 + 0.5)
    for y = CY - 15, CY + 15 do
      local d = math.abs(y - CY); local c = nil
      if d <= 2 then c = "#ffffff" elseif d <= 7 + wob then c = (d <= 4) and "#c8ffff" or "#27f0ff" elseif d <= 12 + wob then if dith(x, y, 0.7 - (d - 7) / 10) then c = "#ff2a8a" end end
      if c then px(im, x, y, C(c)) end
    end
    if (x * 7 + f * 11) % 13 == 0 then px(im, x, CY - 13 - ri(0, 2), C("#9ff8ff")) end
  end
  add("beamfire", im)
end

-- ------------------------------------------------------------------ sprite
local spr = Sprite(WW, HH, ColorMode.RGB)
spr.filename = out
spr.layers[1].name = "projectiles"
for i = 2, #frames do spr:newEmptyFrame() end
local ranges, order = {}, {}
for i, fr in ipairs(frames) do
  spr.frames[i].duration = 0.07
  spr:newCel(spr.layers[1], spr.frames[i], fr[2], Point(0, 0))
  if not ranges[fr[1]] then ranges[fr[1]] = { i, i }; order[#order + 1] = fr[1] else ranges[fr[1]][2] = i end
end
for _, name in ipairs(order) do local t = spr:newTag(ranges[name][1], ranges[name][2]); t.name = name end
spr:saveAs(out)
print("projectiles: " .. #spr.frames .. " frames, " .. #spr.tags .. " tags -> " .. out)
