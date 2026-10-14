-- VEEXING FORCE - pick-up weapons + objects lobbed by the BRUTE, drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py).
-- Sprite 64x48. Everything faces RIGHT (the game mirrors it). GRIP / object centre = (16, 24).
--   bar (1)  knife (1)  nunchaku (4: chain swings)  taser (4: arc flickers)  grenade (1)
--   barrel (1)  crate (1)  tire (1)  unit (2: LEDs blink)       <- objects centred on (16, 24), the game rotates them in flight
WW, HH = 64, 48
dofile(app.params["lib"])
local out = app.params["out"]
seed = 4242
local CX, CY = 16, 24
local OUT = "#12081e"

local frames = {}
local function add(tag, im) frames[#frames + 1] = { tag, im } end

local function line(im, x0, y0, x1, y1, col)
  x0, y0, x1, y1 = math.floor(x0 + 0.5), math.floor(y0 + 0.5), math.floor(x1 + 0.5), math.floor(y1 + 0.5)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0); local sx = x0 < x1 and 1 or -1; local sy = y0 < y1 and 1 or -1; local e = dx + dy
  while true do
    px(im, x0, y0, col)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * e
    if e2 >= dy then e = e + dy; x0 = x0 + sx end
    if e2 <= dx then e = e + dx; y0 = y0 + sy end
  end
end
-- thick bar with dark outline: pass cols {base, light, shade}
local function bar(im, x0, y0, x1, y1, th, cols)
  local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
  local function stamp(r, col) for i = 0, n do
    local x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
    for yy = -r, r do for xx = -r, r do if xx * xx + yy * yy <= r * r + r * 0.5 then px(im, math.floor(x + 0.5) + xx, math.floor(y + 0.5) + yy, col) end end end
  end end
  local r = th / 2
  stamp(r + 1, C(OUT)); stamp(r, C(cols[1]))
  if th >= 3 then
    for i = 0, n do local x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
      px(im, math.floor(x + 0.5), math.floor(y + 0.5) - 1, C(cols[2])); if th >= 4 then px(im, math.floor(x + 0.5), math.floor(y + 0.5) + 1, C(cols[3])) end end
  end
end
local function ellipse(im, cx, cy, rx, ry, colf)
  for y = math.floor(cy - ry - 1), math.ceil(cy + ry + 1) do for x = math.floor(cx - rx - 1), math.ceil(cx + rx + 1) do
    local d = ((x + 0.5 - cx) / rx) ^ 2 + ((y + 0.5 - cy) / ry) ^ 2
    if d <= 1 then local c = colf(x, y, d); if c then px(im, x, y, C(c)) end end
  end end
end
local function frame(im, x0, y0, x1, y1, fill, light, shade)   -- outlined box with a lit top-left and shaded bottom-right
  rect(im, x0 - 1, y0 - 1, x1 + 1, y1 + 1, C(OUT)); rect(im, x0, y0, x1, y1, C(fill))
  if light then hline(im, x0, x1, y0, C(light)); vline(im, x0, y0, y1, C(light)) end
  if shade then hline(im, x0, x1, y1, C(shade)); vline(im, x1, y0, y1, C(shade)) end
end

-- ================================================================== weapons
-- ---- BARRE A MINE: steel crowbar, claw end, red tape grip ----
do
  local im = newImg()
  bar(im, CX - 7, CY, CX + 31, CY, 3, { "#aab4cc", "#e6ecfa", "#6c768e" })
  bar(im, CX + 30, CY, CX + 37, CY - 7, 3, { "#aab4cc", "#e6ecfa", "#6c768e" })
  px(im, CX + 36, CY - 10, C(OUT)); px(im, CX + 37, CY - 10, C(OUT)); px(im, CX + 38, CY - 9, C(OUT))   -- claw fork
  px(im, CX + 36, CY - 9, C("#cfd6e6")); px(im, CX + 37, CY - 9, C("#aab4cc")); px(im, CX + 34, CY - 8, C("#6c768e"))
  rect(im, CX - 9, CY - 2, CX - 8, CY + 2, C(OUT)); px(im, CX - 8, CY - 1, C("#cfd6e6"))               -- flat chisel butt
  for x = CX - 6, CX + 5 do                                                                              -- red tape wrap
    for y = CY - 1, CY + 1 do px(im, x, y, C(((x - CX) % 4 == 0) and "#7a0a22" or (y == CY - 1 and "#ff5a74" or "#e01a3c"))) end
  end
  for x = CX + 8, CX + 28, 6 do px(im, x, CY, C("#7a849c")) end                                         -- wear marks
  add("bar", im)
end
-- ---- COUTEAU: combat knife ----
do
  local im = newImg()
  bar(im, CX - 7, CY, CX + 3, CY, 3, { "#4a3322", "#7a5638", "#2a1c12" })
  for x = CX - 5, CX + 2, 3 do px(im, x, CY - 1, C("#1c120a")); px(im, x, CY + 1, C("#1c120a")) end     -- grip grooves
  vline(im, CX + 4, CY - 4, CY + 4, C(OUT)); vline(im, CX + 3, CY - 3, CY + 3, C("#c9a23a")); px(im, CX + 3, CY - 3, C("#ffe44d"))   -- guard
  for x = CX + 5, CX + 27 do                                                                             -- blade: tapering, curved tip
    local t = (x - (CX + 5)) / 22
    local h = (t < 0.7) and (2.9 - t * 0.6) or (2.5 * (1 - (t - 0.7) / 0.3) + 0.2)
    local top, bot = math.floor(CY - h + 0.5), math.floor(CY + h + 0.5)
    px(im, x, top - 1, C(OUT)); px(im, x, bot + 1, C(OUT))
    for y = top, bot do
      local c = "#c8d2ea"
      if y == top then c = "#ffffff" elseif y == CY then c = "#9aa6c4" elseif y > CY then c = "#8894b4" end
      px(im, x, y, C(c))
    end
  end
  px(im, CX + 28, CY, C(OUT)); px(im, CX + 27, CY - 1, C(OUT))
  add("knife", im)
end
-- ---- NUNCHAKU: two orange sticks + chain; 4 frames of chain swing ----
for f = 0, 3 do
  local im = newImg()
  local a = math.sin(f / 4 * math.pi * 2) * 0.75
  local WOOD = { "#e09a34", "#ffd070", "#8a4e14" }
  bar(im, CX - 5, CY, CX + 13, CY, 4, WOOD)
  px(im, CX - 5, CY - 2, C("#5a2c08")); px(im, CX - 5, CY + 2, C("#5a2c08"))
  rect(im, CX + 4, CY - 1, CX + 5, CY + 1, C("#4a280a")); rect(im, CX + 10, CY - 1, CX + 11, CY + 1, C("#4a280a"))   -- binding rings
  local ex, ey = CX + 14 + 7 * math.cos(a), CY + 7 * math.sin(a)
  for i = 0, 4 do   -- chain links
    local t = i / 4; local lx, ly = CX + 14 + (ex - CX - 14) * t, CY + (ey - CY) * t
    px(im, math.floor(lx + 0.5), math.floor(ly + 0.5) + (i % 2), C(i % 2 == 0 and "#e8eefc" or "#8a96b4"))
  end
  local a2 = a * 1.6 + 0.5
  bar(im, ex, ey, ex + 15 * math.cos(a2), ey + 15 * math.sin(a2), 4, WOOD)
  px(im, math.floor(ex + 4 * math.cos(a2)), math.floor(ey + 4 * math.sin(a2)) - 2, C("#5a2c08"))
  add("nunchaku", im)
end
-- ---- MATRAQUE / TASER: rubber handle, steel shaft, two prongs, crackling cyan arc ----
for f = 0, 3 do
  local im = newImg()
  bar(im, CX - 7, CY, CX + 10, CY, 4, { "#34343e", "#5a5a6a", "#18181e" })
  for x = CX - 5, CX + 8, 3 do px(im, x, CY - 1, C("#12121a")); px(im, x, CY + 1, C("#12121a")) end   -- rubber ridges
  rect(im, CX + 10, CY - 3, CX + 12, CY + 3, C(OUT)); rect(im, CX + 11, CY - 2, CX + 11, CY + 2, C("#c9a23a"))   -- collar
  bar(im, CX + 13, CY, CX + 22, CY, 4, { "#8a92aa", "#dfe6f8", "#4a5268" })
  -- prongs
  rect(im, CX + 22, CY - 4, CX + 27, CY - 3, C(OUT)); rect(im, CX + 22, CY + 3, CX + 27, CY + 4, C(OUT))
  rect(im, CX + 23, CY - 3, CX + 27, CY - 3, C("#dfe6f8")); rect(im, CX + 23, CY + 3, CX + 27, CY + 3, C("#8a92aa"))
  -- arc between prongs and beyond
  local pts = { { 27, -3 } }
  for i = 1, 4 do pts[#pts + 1] = { 27 + i * 2.4, ((i + f) % 2 == 0 and -1 or 1) * (1 + (i + f * 2) % 3) } end
  pts[#pts + 1] = { 27, 3 }
  local prev = pts[1]
  for i = 2, #pts do
    line(im, CX + prev[1], CY + prev[2], CX + pts[i][1], CY + pts[i][2], C("#27f0ff"))
    if i < #pts then px(im, math.floor(CX + pts[i][1]), math.floor(CY + pts[i][2]), C("#ffffff")) end
    prev = pts[i]
  end
  line(im, CX + 27, CY - 3, CX + 27 + (f % 2) * 2, CY + 3, C("#ffffff"))
  add("taser", im)
end
-- ---- GRENADE: olive pineapple, pin ring, lever ----
do
  local im = newImg()
  local gx, gy = CX + 6, CY + 1
  ellipse(im, gx, gy, 7.8, 9.3, function() return OUT end)
  ellipse(im, gx, gy, 6.4, 7.9, function(x, y, d)
    local c = (d > 0.6) and "#2f5a1e" or "#4a8a30"
    if (x + y) % 4 == 0 and d > 0.15 then c = "#2a4e1a" end                 -- segment cross-hatch
    if (x - y) % 4 == 0 and d > 0.15 then c = "#3a6c26" end
    if x < gx - 1.5 and y < gy - 1 and d < 0.7 then c = "#7ac058" end        -- lit side
    return c
  end)
  px(im, gx - 3, gy - 4, C("#d8f8b8")); px(im, gx - 2, gy - 5, C("#d8f8b8"))
  rect(im, gx - 3, gy - 12, gx + 3, gy - 8, C(OUT)); rect(im, gx - 2, gy - 11, gx + 2, gy - 9, C("#a0a0b0")); hline(im, gx - 2, gx + 2, gy - 11, C("#e0e0ee"))   -- fuze neck
  line(im, gx + 3, gy - 11, gx + 9, gy - 6, C(OUT)); line(im, gx + 3, gy - 10, gx + 8, gy - 6, C("#7a7a8a"))                                           -- lever
  for _, o in ipairs({ { 11, -13 }, { 12, -12 }, { 13, -11 }, { 12, -10 }, { 11, -9 }, { 10, -10 }, { 10, -12 } }) do px(im, gx + o[1] - 2, gy + o[2] + 1, C("#ffe44d")) end   -- pull ring
  add("grenade", im)
end

-- ================================================================== lobbed objects (centred)
-- ---- barrel: oil drum, hazard label ----
do
  local im = newImg()
  frame(im, CX - 10, CY - 13, CX + 10, CY + 13, "#c0542a", "#e88a52", "#7a2c14")
  for x = CX - 6, CX + 6, 4 do vline(im, x, CY - 12, CY + 12, C("#a8441e")) end                      -- body panels
  rect(im, CX - 10, CY - 9, CX + 10, CY - 7, C("#3a2424")); rect(im, CX - 10, CY + 7, CX + 10, CY + 9, C("#3a2424"))   -- rolled hoops
  hline(im, CX - 10, CX + 10, CY - 9, C("#6a4444")); hline(im, CX - 10, CX + 10, CY + 7, C("#6a4444"))
  rect(im, CX - 5, CY - 3, CX + 5, CY + 3, C("#ffd23a"))                                              -- hazard label
  for i = 0, 5 do rect(im, CX - 6 + i * 2, CY - 3, CX - 5 + i * 2, CY + 3, C(i % 2 == 0 and "#12081e" or "#ffd23a")) end
  rect(im, CX - 5, CY - 3, CX - 5, CY + 3, C("#12081e")); rect(im, CX + 5, CY - 3, CX + 5, CY + 3, C("#12081e"))
  hline(im, CX - 10, CX + 10, CY - 13, C("#f0b090")); px(im, CX + 6, CY - 12, C("#8a8a9a"))           -- lit rim + bung
  add("barrel", im)
end
-- ---- crate: planks, corners, nails ----
do
  local im = newImg()
  frame(im, CX - 12, CY - 12, CX + 12, CY + 12, "#a06a30", "#d49a58", "#5a3414")
  for _, y in ipairs({ CY - 4, CY + 4 }) do hline(im, CX - 11, CX + 11, y, C("#5a3414")) end         -- plank joints
  for x = CX - 10, CX + 10, 3 do px(im, x, CY - 9, C("#7a4a1e")); px(im, x + 1, CY + 1, C("#7a4a1e")); px(im, x, CY + 8, C("#7a4a1e")) end   -- grain
  for i = -10, 10 do px(im, CX + i, CY + i, C("#4a2c10")); px(im, CX + i, CY - i, C("#4a2c10")) end   -- brace
  for _, c in ipairs({ { -11, -11 }, { 8, -11 }, { -11, 8 }, { 8, 8 } }) do
    rect(im, CX + c[1], CY + c[2], CX + c[1] + 3, CY + c[2] + 3, C("#6a707e")); px(im, CX + c[1] + 1, CY + c[2] + 1, C("#d8dcea"))   -- steel corner + rivet
  end
  add("crate", im)
end
-- ---- tyre: tread, rim ----
do
  local im = newImg()
  ellipse(im, CX, CY, 14.5, 14.5, function() return OUT end)
  ellipse(im, CX, CY, 13.2, 13.2, function(x, y, d)
    local ang = math.atan(y + 0.5 - CY, x + 0.5 - CX); local seg = math.floor((ang + math.pi) / (math.pi * 2) * 20)
    local c = (seg % 2 == 0) and "#2a2a36" or "#1c1c26"
    if d > 0.62 and y < CY - 3 and x < CX + 2 then c = "#4a4a5e" end                                   -- sheen
    return c
  end)
  ellipse(im, CX, CY, 7.5, 7.5, function(x, y, d) return d > 0.7 and "#12121a" or "#2e2e3c" end)       -- sidewall ring
  ellipse(im, CX, CY, 5.2, 5.2, function(x, y, d) return (d > 0.75) and "#6a7088" or "#a0a8c0" end)    -- alloy rim
  for k = 0, 4 do local a = k / 5 * math.pi * 2 + 0.3; px(im, math.floor(CX + math.cos(a) * 3.2), math.floor(CY + math.sin(a) * 3.2), C("#3a4058")) end   -- lug nuts
  px(im, CX, CY, C("#12121a"))
  add("tire", im)
end
-- ---- unit: server / battery block, 2 frames of blinking LEDs ----
for f = 0, 1 do
  local im = newImg()
  frame(im, CX - 13, CY - 11, CX + 13, CY + 11, "#5a6478", "#8896b4", "#2e3648")
  rect(im, CX - 12, CY - 10, CX + 12, CY - 6, C("#3a4458")); hline(im, CX - 12, CX + 12, CY - 6, C("#242c3c"))   -- top plate
  for i = 0, 3 do rect(im, CX - 10 + i * 6, CY - 9, CX - 7 + i * 6, CY - 8, C("#6a7692")) end                    -- vents
  rect(im, CX - 11, CY - 2, CX - 8, CY + 1, C(f == 0 and "#3dffa0" or "#14603a"))
  rect(im, CX - 6, CY - 2, CX - 3, CY + 1, C(f == 0 and "#6a1020" or "#ff2a4d"))
  rect(im, CX, CY - 2, CX + 11, CY, C("#12081e")); hline(im, CX + 1, CX + 10, CY - 1, C("#27f0ff"))              -- display bar
  for x = CX - 11, CX + 11, 3 do px(im, x, CY + 5, C("#2a3244")); px(im, x, CY + 7, C("#2a3244")) end            -- ports
  px(im, CX + 11, CY + 9, C("#ffd23a"))                                                                          -- hazard dot
  add("unit", im)
end

-- ------------------------------------------------------------------ sprite
local spr = Sprite(WW, HH, ColorMode.RGB)
spr.filename = out
spr.layers[1].name = "weapons"
for i = 2, #frames do spr:newEmptyFrame() end
local ranges, order = {}, {}
for i, fr in ipairs(frames) do
  spr.frames[i].duration = 0.08
  spr:newCel(spr.layers[1], spr.frames[i], fr[2], Point(0, 0))
  if not ranges[fr[1]] then ranges[fr[1]] = { i, i }; order[#order + 1] = fr[1] else ranges[fr[1]][2] = i end
end
for _, name in ipairs(order) do local t = spr:newTag(ranges[name][1], ranges[name][2]); t.name = name end
spr:saveAs(out)
print("weapons: " .. #spr.frames .. " frames, " .. #spr.tags .. " tags -> " .. out)
