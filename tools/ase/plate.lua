-- VEEXING FORCE - electrified floor plate (stage 4), drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py):
--   aseprite -b --script-param out=<...>/assets/props/plate.aseprite --script-param lib=<...>/tools/ase/bglib.lua --script tools/ase/plate.lua
-- Sprite 132x46 = the 120x34 plate + a 6 px margin (arcs / glow may overflow). Anchor for the game = (6, 6) = top-left of the plate.
-- Layers: plate (steel: frame, hazard stripes, bolts, grating, conductor rails, capacitor pylons, HV sign, status LED)
--         light (ADDITIVE: rail glow, lit grating, arcs, sparks)
-- Tags: off (2 frames: idle, LED blink) | warn (6 frames: the rails charge up, crackles, red LED) | active (6 frames: discharge, arcs)
WW, HH = 132, 46
dofile(app.params["lib"])
local out = app.params["out"]
seed = 404

local P = {
  out = "#03050c", st0 = "#0a1020", st1 = "#162238", st2 = "#24344e", st3 = "#3a5070", st4 = "#6a86a8",
  grate0 = "#070b16", grate1 = "#0e1626", rail0 = "#1a2a2e", rail1 = "#2a4a4a", copper = "#8a5a2a", copper2 = "#c88a4a",
  yel = "#e8c020", yel2 = "#8a7010", blk = "#121212",
  cyan = "#27f0ff", cyan2 = "#9ff8ff", white = "#f4ffff", red = "#ff2a4d", green = "#3dffa0",
}
local X0, Y0, PW, PH = 6, 6, 120, 34          -- plate rectangle inside the sprite
local RAILS = { Y0 + 11, Y0 + 23 }             -- conductor rail rows

-- ------------------------------------------------------------------ the steel plate (shared by every frame)
local function base(led)
  local im = newImg()
  -- shadow under the plate + outer frame
  rect(im, X0 - 2, Y0 - 1, X0 + PW + 1, Y0 + PH + 2, C(P.out))
  rect(im, X0 - 1, Y0 - 1, X0 + PW, Y0 + PH, C(P.st1))
  hline(im, X0 - 1, X0 + PW, Y0 - 1, C(P.st4)); hline(im, X0, X0 + PW - 1, Y0, C(P.st3))
  vline(im, X0 + PW, Y0, Y0 + PH, C(P.st0))
  -- hazard stripes on the top and bottom rims
  for x = X0, X0 + PW - 1 do
    for _, y in ipairs({ Y0 + 1, Y0 + 2, Y0 + PH - 2, Y0 + PH - 1 }) do
      px(im, x, y, C(((x + y) // 4) % 2 == 0 and P.yel or P.blk))
    end
  end
  hline(im, X0, X0 + PW - 1, Y0 + 3, C(P.st0)); hline(im, X0, X0 + PW - 1, Y0 + PH - 3, C(P.st2))
  -- grating: recessed square cells
  for y = Y0 + 4, Y0 + PH - 4 do for x = X0 + 14, X0 + PW - 15 do
    local cx, cy = (x - X0) % 5, (y - Y0) % 5
    local c = (cx == 0 or cy == 0) and P.st2 or ((cx == 1 or cy == 1) and P.grate1 or P.grate0)
    px(im, x, y, C(c))
  end end
  -- two conductor rails (copper with insulators every 12 px)
  for _, ry in ipairs(RAILS) do
    for x = X0 + 14, X0 + PW - 15 do
      local ins = ((x - X0) % 12) < 2
      px(im, x, ry - 1, C(ins and P.st3 or P.copper2)); px(im, x, ry, C(ins and P.st2 or P.copper)); px(im, x, ry + 1, C(ins and P.st0 or P.rail0))
    end
  end
  -- capacitor pylons at both ends (box + coil rings + lens)
  for _, bx in ipairs({ X0 + 2, X0 + PW - 13 }) do
    rect(im, bx, Y0 + 5, bx + 10, Y0 + PH - 6, C(P.st2)); hline(im, bx, bx + 10, Y0 + 5, C(P.st4)); vline(im, bx + 10, Y0 + 5, Y0 + PH - 6, C(P.st0))
    for y = Y0 + 8, Y0 + PH - 9, 3 do hline(im, bx + 2, bx + 8, y, C(P.copper)); hline(im, bx + 2, bx + 8, y + 1, C(P.rail0)) end
    for _, ry in ipairs(RAILS) do rect(im, bx + 3, ry - 1, bx + 7, ry + 1, C(P.rail1)); px(im, bx + 5, ry, C("#1a6a7a")) end
  end
  -- bolts (corners + middle of the rims)
  for _, b in ipairs({ { X0 + 1, Y0 + 1 }, { X0 + PW - 3, Y0 + 1 }, { X0 + 1, Y0 + PH - 3 }, { X0 + PW - 3, Y0 + PH - 3 }, { X0 + 59, Y0 - 1 }, { X0 + 59, Y0 + PH } }) do
    rect(im, b[1], b[2], b[1] + 1, b[2] + 1, C(P.st3)); px(im, b[1], b[2], C(P.st4)); px(im, b[1] + 1, b[2] + 1, C(P.st0))
  end
  -- HV warning sign (yellow triangle + lightning bolt) on the grating, left of centre
  local sx, sy = X0 + 30, Y0 + 13
  for k = 0, 8 do hline(im, sx + 8 - k, sx + 8 + k, sy + k, C(P.yel)) end
  hline(im, sx, sx + 16, sy + 9, C(P.yel2))
  for _, q in ipairs({ { 9, 2 }, { 8, 3 }, { 8, 4 }, { 7, 5 }, { 9, 5 }, { 10, 5 }, { 9, 6 }, { 8, 7 } }) do px(im, sx + q[1], sy + q[2], C(P.blk)) end
  neonText(im, nil, "HV", X0 + 86, Y0 + 14, 1, P.yel, P.yel, 0)
  -- status LED (bottom-right of the frame)
  local lc = ({ off = "#1a4a2a", blink = P.green, warn = P.red, active = P.white })[led]
  rect(im, X0 + PW - 9, Y0 + PH - 2, X0 + PW - 7, Y0 + PH, C(P.out)); px(im, X0 + PW - 8, Y0 + PH - 1, C(lc))
  return im
end

-- ------------------------------------------------------------------ lights (additive layer)
local function arc(acc, im, xa, ya, xb, yb, jag, core)
  local x, y = xa, ya
  local n = math.max(2, math.floor(math.abs(xb - xa) / 7))
  for i = 1, n do
    local t = i / n
    local nx = math.floor(xa + (xb - xa) * t + 0.5); local ny = math.floor(ya + (yb - ya) * t + (i < n and ri(-jag, jag) or 0) + 0.5)
    ny = math.max(Y0 + 4, math.min(Y0 + PH - 4, ny))
    local steps = math.max(math.abs(nx - x), math.abs(ny - y), 1)
    for k = 0, steps do
      local qx, qy = math.floor(x + (nx - x) * k / steps + 0.5), math.floor(y + (ny - y) * k / steps + 0.5)
      px(im, qx, qy, C(core and P.white or P.cyan2)); addL(acc, qx, qy, rgb(P.cyan), 0.5); emit(acc, qx, qy, P.cyan, 0.04, 3)
    end
    x, y = nx, ny
  end
end
local function lights(kind, f)
  local im, acc = newImg(), {}
  local k = (kind == "warn") and (f + 1) / 6 or ((kind == "active") and 1 or 0)
  -- rails glow (dim when off, charging when warn, white-hot when active)
  for _, ry in ipairs(RAILS) do
    for x = X0 + 14, X0 + PW - 15 do
      if ((x - X0) % 12) >= 2 then
        if kind == "off" then if (x + f * 3) % 9 == 0 then addL(acc, x, ry, rgb(P.cyan), 0.18) end
        else
          local flick = (kind == "warn") and (((x * 7 + f * 13) % 11) < 2 + k * 9) or true
          if flick then addL(acc, x, ry, rgb(kind == "active" and P.cyan2 or P.cyan), 0.35 + 0.55 * k); if kind == "active" then px(im, x, ry, C(P.white)) end end
          emit(acc, x, ry, P.cyan, 0.02 * k, 3)
        end
      end
    end
  end
  -- capacitor lenses
  for _, bx in ipairs({ X0 + 2, X0 + PW - 13 }) do
    for _, ry in ipairs(RAILS) do
      local a = kind == "off" and 0.15 or (0.3 + 0.7 * k)
      emit(acc, bx + 5, ry, P.cyan, 0.2 * a, 4); if kind ~= "off" then px(im, bx + 5, ry, C(P.cyan2)) end
    end
  end
  -- grating cells light up (warn: a few, active: most), crackles
  if kind ~= "off" then
    for y = Y0 + 5, Y0 + PH - 5, 5 do for x = X0 + 16, X0 + PW - 17, 5 do
      if rnd() < (kind == "active" and 0.55 or 0.12 * k) then addL(acc, x, y, rgb(P.cyan), kind == "active" and 0.35 or 0.25); addL(acc, x + 1, y, rgb(P.cyan), 0.2) end
    end end
    for i = 1, (kind == "active" and 10 or math.floor(2 + k * 5)) do
      local x, y = ri(X0 + 14, X0 + PW - 15), ri(Y0 + 5, Y0 + PH - 5); px(im, x, y, C(P.white)); emit(acc, x, y, P.cyan, 0.08, 2)
    end
  end
  -- arcs: warn = short sparks between a pylon and the rails; active = long arcs pylon to pylon + rail to rail
  if kind == "warn" and f >= 2 then
    local side = (f % 2 == 0) and X0 + 12 or X0 + PW - 14
    arc(acc, im, side, RAILS[1], side + ((f % 2 == 0) and 1 or -1) * ri(12, 22), RAILS[2], 3, false)
  elseif kind == "active" then
    arc(acc, im, X0 + 12, RAILS[1], X0 + PW - 14, RAILS[2], 4, true)
    arc(acc, im, X0 + 12, RAILS[2], X0 + PW - 14, RAILS[1], 4, true)
    arc(acc, im, X0 + 14 + ri(0, 40), RAILS[1], X0 + 40 + ri(20, 60), RAILS[2], 3, false)
    -- discharge sparks jumping above the rims
    for i = 1, 4 do local x = ri(X0 + 10, X0 + PW - 10); for d = 1, ri(2, 5) do px(im, x + ri(-1, 1), Y0 - d, C(P.cyan2)) end end
  end
  return bake(acc, im, 1.6)
end

-- ------------------------------------------------------------------ frames + tags
local spr = Sprite(WW, HH, ColorMode.RGB)
spr.filename = out
local L1 = spr.layers[1]; L1.name = "plate"
local L2 = spr:newLayer(); L2.name = "light"; L2.blendMode = BlendMode.ADDITION
local frames = {}
for f = 0, 1 do frames[#frames + 1] = { "off", f, f == 1 and "blink" or "off", 0.5 } end
for f = 0, 5 do frames[#frames + 1] = { "warn", f, (f % 2 == 0) and "warn" or "off", 0.09 } end
for f = 0, 5 do frames[#frames + 1] = { "active", f, "active", 0.06 } end
for i = 2, #frames do spr:newEmptyFrame() end
for i, fr in ipairs(frames) do
  spr.frames[i].duration = fr[4]
  spr:newCel(L1, spr.frames[i], base(fr[3]), Point(0, 0))
  spr:newCel(L2, spr.frames[i], lights(fr[1], fr[2]), Point(0, 0))
end
local function tag(name, a, b) local t = spr:newTag(a, b); t.name = name end
tag("off", 1, 2); tag("warn", 3, 8); tag("active", 9, 14)
spr:saveAs(out)
print("plate: " .. #spr.frames .. " frames, " .. #spr.layers .. " layers, " .. #spr.tags .. " tags -> " .. out)
