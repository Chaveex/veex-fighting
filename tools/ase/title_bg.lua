-- VEEXING FORCE - title screen backdrop, drawn pixel by pixel in Aseprite (batch, see tools/make_prop_sprites.py).
-- 640x360, 8 frames looped by the game (the grid rolls toward the camera, the sun stripes scroll). Anchor (0, 0).
-- Layers: sky (banded dithered gradient + stars) | sun (striped, scrolling cuts) | mountains (two ranges, neon rim)
--         grid (perspective floor) | glow (ADDITIVE: horizon haze + sun halo)
-- The portrait sits on the left and the logo top-right, so the sun is placed right (x 440) and the left side stays calm.
WW, HH = 640, 360
dofile(app.params["lib"])
local out = app.params["out"]
seed = 1986
local HZ, SX, NF = 214, 440, 8

local function sky()
  local im = newImg()
  vgrad(im, 0, 0, WW - 1, HZ - 1, { "#07021c", "#12053a", "#260a58", "#3a0a6a", "#6a1278", "#a8208a", "#e0308e", "#ff4f9a" }, 3)
  for i = 1, 120 do local x, y = ri(0, WW - 1), ri(0, HZ - 70); local b = rnd(); px(im, x, y, C(b > 0.9 and "#ffffff" or (b > 0.55 and "#c8b8ff" or "#6a5aa8"))) end
  for _, s in ipairs({ { 90, 40 }, { 260, 22 }, { 590, 60 }, { 330, 90 } }) do
    local x, y = s[1], s[2]; px(im, x, y, C("#ffffff")); for d = 1, 2 do px(im, x + d, y, C("#a8a0ff")); px(im, x - d, y, C("#a8a0ff")); px(im, x, y + d, C("#a8a0ff")); px(im, x, y - d, C("#a8a0ff")) end
  end
  return im
end
local function sun(f)
  local im = newImg(); local cy, r = HZ - 30, 88
  local bands = { "#fff6a0", "#ffe27a", "#ffc860", "#ffa850", "#ff8a5a", "#ff6a7a", "#ff4f9a", "#ff2fa0" }
  for y = cy - r, HZ - 1 do for x = SX - r, SX + r do
    if (x - SX) ^ 2 + (y - cy) ^ 2 <= r * r then
      local t = (y - (cy - r)) / (2 * r); local fi = t * (#bands - 1); local i = math.floor(fi); local c = bands[i + 1]
      if i + 2 <= #bands and dith(x, y, math.max(0, (fi - i - 0.6) * 2.5)) then c = bands[i + 2] end
      local cut = false
      if y > cy - 34 then local k = (y - (cy - 34) + f * 9 / NF * 1.0) ; local band = math.floor(k / 9); cut = (k % 9) < (1 + band * 0.8) end
      if not cut then px(im, x, y, C(c)) end
    end
  end end
  return im
end
local function mountains()
  local im = newImg()
  local function range(base, amp, freq, phase, col, rim)
    for x = 0, WW - 1 do
      local v = math.min(1, (math.abs(x - SX) / 110) ^ 2)        -- a smooth valley so the sun stays visible
      local h = math.floor(amp * v * (0.55 + 0.45 * math.sin(x * freq + phase)) * (0.6 + 0.4 * math.abs(math.sin(x * freq * 2.7 + phase * 2))) + 0.5)
      local top = base - h
      for y = top, HZ - 1 do px(im, x, y, C(col)) end
      px(im, x, top, C(rim)); if (x % 2 == 0) then px(im, x, top + 1, C(rim, 140)) end
    end
  end
  range(HZ, 46, 0.018, 1.2, "#2a0a4a", "#ff6ad0")
  range(HZ, 26, 0.031, 4.0, "#14062a", "#27f0ff")
  return im
end
local function grid(f)
  local im = newImg()
  for y = HZ, HH - 1 do for x = 0, WW - 1 do px(im, x, y, C(dith(x, y, (y - HZ) / 300) and "#0e0428" or "#0a0320")) end end
  for i = -24, 24 do                                  -- converging lines
    local x0, x1 = SX + i * 14, SX + i * 90
    local n = HH - HZ
    for k = 0, n do local t = k / n; local x = math.floor(x0 + (x1 - x0) * t + 0.5); px(im, x, HZ + k, C(t < 0.15 and "#a0208a" or "#ff2fd0")) end
  end
  for i = 0, 13 do                                    -- horizontal lines rolling toward the camera
    local k = (i + f / NF) / 13; local y = math.floor(HZ + (k ^ 2.2) * (HH - HZ) + 0.5)
    if y < HH then for x = 0, WW - 1 do px(im, x, y, C(k < 0.12 and "#a0208a" or "#ff2fd0")) end end
  end
  hline(im, 0, WW - 1, HZ, C("#ff9ae0"))
  return im
end
local function glow()
  local acc = {}
  for y = HZ - 8, HZ + 30 do local a = (y < HZ) and (1 - (HZ - y) / 8) * 0.35 or (1 - (y - HZ) / 30) * 0.45
    for x = 0, WW - 1, 1 do if dith(x, y, a * 1.6) then addL(acc, x, y, rgb("#ff2fd0"), a) end end end
  for y = HZ - 130, HZ do for x = SX - 130, SX + 130 do
    local d = math.sqrt((x - SX) ^ 2 + (y - (HZ - 30)) ^ 2); if d > 88 and d < 130 then local a = (1 - (d - 88) / 42) * 0.22; if dith(x, y, a * 3) then addL(acc, x, y, rgb("#ff8a6a"), a) end end
  end end
  return bake(acc, nil, 1.3)
end

local spr = Sprite(WW, HH, ColorMode.RGB)
spr.filename = out
local Lsky = spr.layers[1]; Lsky.name = "sky"
local Lsun = spr:newLayer(); Lsun.name = "sun"
local Lmt = spr:newLayer(); Lmt.name = "mountains"
local Lgr = spr:newLayer(); Lgr.name = "grid"
local Lgl = spr:newLayer(); Lgl.name = "glow"; Lgl.blendMode = BlendMode.ADDITION
for i = 2, NF do spr:newEmptyFrame() end
local SKY, MT, GL = sky(), mountains(), glow()
for f = 1, NF do
  spr.frames[f].duration = 0.1
  spr:newCel(Lsky, spr.frames[f], SKY, Point(0, 0)); spr:newCel(Lmt, spr.frames[f], MT, Point(0, 0)); spr:newCel(Lgl, spr.frames[f], GL, Point(0, 0))
  spr:newCel(Lsun, spr.frames[f], sun(f - 1), Point(0, 0)); spr:newCel(Lgr, spr.frames[f], grid(f - 1), Point(0, 0))
end
local t = spr:newTag(1, NF); t.name = "bg"
spr:saveAs(out)
print("title_bg: " .. #spr.frames .. " frames, " .. #spr.layers .. " layers -> " .. out)
