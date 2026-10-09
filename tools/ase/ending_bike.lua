-- VEEXING FORCE - ENDING motorbike, drawn pixel by pixel in Aseprite (batch, see tools/make_ending_bike.py).
-- An 80s cafe racer seen from the side, facing RIGHT: V-twin with cooling fins, chrome pipes, teardrop tank in the hero's colour,
-- telescopic fork, disc brake, round headlight, neon rims. Light comes from the upper right (the sun is behind the bike).
-- Output: assets/ending/bike.aseprite  layers: body_pink | body_cyan | under (additive neon underglow)
--         assets/ending/bike_wheel.aseprite  6 frames: the 5-spoke wheel turning by 12 degrees per frame (5-fold symmetric = a full loop)
-- Bike space: origin = rear tyre contact point, x forward, y up (negative = up on the canvas). Fixed points the rider sprite is pinned to
-- (see js/ending.js): rear axle (0,-16), front axle (64,-16), steering head (52,-47), grip (56,-53), peg (32,-18).
local out, outWheel, metaOut = app.params["out"], app.params["wheel"], app.params["meta"]
WW, HH = 120, 84
dofile(app.params["lib"])
seed = 7
local OX, OY = 24, 74                      -- contact point on the canvas

local INK = "#140818"
local STEEL = { "#fffbe8", "#d8d0f0", "#9a90c0", "#5a4a86", "#2e2254" }          -- chrome ramp, light -> dark
local DARK = { "#5a4a8a", "#3a2a66", "#241846", "#140c2c" }                       -- black parts (frame, seat, tyres)
local SCHEME = {
  pink = { "#ffe0f6", "#ff9ae6", "#ff2fd0", "#b0189e", "#6a0e70" },
  cyan = { "#e0ffff", "#8afaff", "#27f0ff", "#1a98b8", "#0e5470" },
}

local function X(x) return OX + x end
local function Y(y) return OY + y end

-- ------------------------------------------------------------------ primitives (bike space)
local function pt(im, x, y, c) px(im, math.floor(X(x) + 0.5), math.floor(Y(y) + 0.5), C(c)) end
local function inPoly(poly, x, y)
  local inside, n = false, #poly
  local j = n
  for i = 1, n do
    local xi, yi, xj, yj = poly[i][1], poly[i][2], poly[j][1], poly[j][2]
    if ((yi > y) ~= (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi) then inside = not inside end
    j = i
  end
  return inside
end
-- fill a polygon; colf(x, y, u, v) gets u,v in 0..1 inside the bounding box and returns a hex colour (or nil to skip)
local function fill(im, poly, colf)
  local x0, y0, x1, y1 = 1e9, 1e9, -1e9, -1e9
  for _, p in ipairs(poly) do x0 = math.min(x0, p[1]); y0 = math.min(y0, p[2]); x1 = math.max(x1, p[1]); y1 = math.max(y1, p[2]) end
  for y = math.floor(y0), math.ceil(y1) do for x = math.floor(x0), math.ceil(x1) do
    if inPoly(poly, x + 0.5, y + 0.5) then
      local c = colf(x, y, (x - x0) / math.max(1, x1 - x0), (y - y0) / math.max(1, y1 - y0)); if c then pt(im, x, y, c) end
    end
  end end
end
-- banded ramp with dithering between bands; t in 0..1 (0 = first colour)
local function ramp(cols, t, x, y)
  local n = #cols; local f = math.max(0, math.min(0.999, t)) * (n - 1); local i = math.floor(f); local tt = f - i
  local c = cols[i + 1]
  if i + 2 <= n and dith(x, y, math.max(0, math.min(1, (tt - 0.45) * 3 + 0.5))) then c = cols[i + 2] end
  return c
end
local function thick(im, x0, y0, x1, y1, w, colf)       -- capsule along a segment; colf(side 0..1 across the tube, along 0..1)
  local dx, dy = x1 - x0, y1 - y0; local len = math.sqrt(dx * dx + dy * dy); if len == 0 then return end
  local nx, ny = -dy / len, dx / len
  for s = 0, len, 0.5 do
    for k = -w / 2, w / 2, 0.5 do
      local x, y = x0 + dx * s / len + nx * k, y0 + dy * s / len + ny * k
      -- side: 0 on the light side (up/right facing normal), 1 on the shadow side
      local side = (k + w / 2) / w; if ny > 0 then side = 1 - side end
      pt(im, math.floor(x + 0.5), math.floor(y + 0.5), colf(side, s / len))
    end
  end
end
local function chrome(side, along) return STEEL[math.max(1, math.min(5, 1 + math.floor(side * 4.4 + (along * 5 % 2 < 0.35 and 0.8 or 0))))] end
local function black(side) return DARK[math.max(1, math.min(4, 1 + math.floor(side * 3.6)))] end
local function disc(im, cx, cy, r, colf)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2); if d <= r then local c = colf(x, y, d / r, (y - cy) / r, (x - cx) / r); if c then pt(im, x, y, c) end end
  end end
end

-- ------------------------------------------------------------------ the bike
local function bike(scheme)
  local im = newImg(); local S = SCHEME[scheme]
  -- swingarm + shock (behind everything else)
  thick(im, 0, -16, 24, -23, 4, function(s) return black(s) end)
  thick(im, 6, -31, 15, -21, 2, function(s, a) return (math.floor(a * 14) % 2 == 0) and "#ff2a4d" or "#8a1020" end)    -- coil spring
  thick(im, 5, -32, 6, -30, 2, function() return STEEL[2] end)
  -- chain guard / chain
  thick(im, 1, -18, 26, -22, 1, function() return DARK[1] end)
  -- exhaust: one slim chrome header sweeping back under the engine into a tapered silencer with a glowing tip
  thick(im, 40, -18, 28, -12, 3, chrome)
  thick(im, 28, -12, 6, -15, 3, chrome)
  fill(im, { { 8, -18.5 }, { 8, -11.5 }, { -12, -15 }, { -12, -19 } }, function(x, y, u, v) return ramp(STEEL, v * 0.9, x, y) end)
  vline(im, X(2), Y(-18), Y(-12), C(STEEL[4])); vline(im, X(-5), Y(-18), Y(-13), C(STEEL[4]))
  disc(im, -12.5, -17, 2.2, function(x, y, r) return r > 0.55 and "#ff7a3a" or "#ffe0a0" end)
  -- frame tubes: down tube to the steering head, seat rail
  thick(im, 26, -23, 52, -47, 3, function(s) return black(s) end)
  thick(im, 6, -31, 28, -38, 2, function(s) return black(s) end)
  -- engine: crankcase + two finned cylinders in a V
  fill(im, { { 21, -28 }, { 43, -28 }, { 44, -14 }, { 20, -14 } }, function(x, y, u, v) return ramp(STEEL, 0.25 + v * 0.7 + (u > 0.8 and -0.15 or 0), x, y) end)
  fill(im, { { 24, -29 }, { 31, -29 }, { 27, -41 }, { 20, -40 } }, function(x, y, u, v) return (math.floor(y) % 3 == 0) and STEEL[1] or ramp(STEEL, 0.4 + u * 0.4, x, y) end)    -- rear cylinder (fins)
  fill(im, { { 34, -29 }, { 41, -29 }, { 47, -40 }, { 40, -41 } }, function(x, y, u, v) return (math.floor(y) % 3 == 0) and STEEL[1] or ramp(STEEL, 0.4 + u * 0.4, x, y) end)    -- front cylinder
  rect(im, X(21), Y(-23), X(43), Y(-22), C(STEEL[4])); rect(im, X(21), Y(-15), X(43), Y(-14), C(STEEL[5]))                   -- case split + sump shadow
  disc(im, 31, -20, 3.2, function(x, y, r) return r > 0.7 and STEEL[3] or (r > 0.35 and STEEL[2] or "#ff2a4d") end)         -- clutch cover with a red badge
  -- teardrop fuel tank (hero colour), glossy
  local tank = { { 22, -41 }, { 28, -47 }, { 40, -50 }, { 50, -48 }, { 54, -44 }, { 51, -39 }, { 38, -37 }, { 28, -37 } }
  fill(im, tank, function(x, y, u, v)
    local t = v * 0.85 + (1 - u) * 0.15; local c = ramp(S, t, x, y)
    if v < 0.14 and u > 0.25 and u < 0.8 then c = S[1] end                                     -- specular streak along the top
    return c
  end)
  for k = 0, 11 do pt(im, 30 + k, -45.5 + k * 0.05 - (k > 6 and (k - 6) * 0.18 or 0), S[1]) end
  hline(im, X(26), X(52), Y(-38), C(S[5]))
  -- seat (stepped, scooped) + tail cowl
  fill(im, { { -4, -34 }, { 3, -37 }, { 10, -36 }, { 14, -38 }, { 25, -38 }, { 26, -35 }, { 12, -32 }, { 0, -31 } },
    function(x, y, u, v) return v < 0.22 and "#8a7ac0" or v < 0.55 and "#4a3a80" or v < 0.85 and "#2a1c58" or "#140c2c" end)
  for k = 0, 5 do pt(im, 14 + k * 2, -37.4, "#9a8ad0") end                                                                  -- stitched highlight
  fill(im, { { -15, -35 }, { -8, -41 }, { 2, -39 }, { -2, -34 } }, function(x, y, u, v) return ramp(S, v * 0.9, x, y) end)   -- cowl
  hline(im, X(-12), X(-4), Y(-38), C(S[1]))
  rect(im, X(-16), Y(-37), X(-14), Y(-34), C("#ff2a4d")); pt(im, -17, -36, "#ff9a9a"); pt(im, -16, -37, "#ffd0d0")           -- tail light
  -- rear fender: a short arc hugging the wheel
  for ang = 118, 160, 1.5 do local r = math.rad(ang); local x, y = 0 + 19.5 * math.cos(r), -16 - 19.5 * math.sin(r); disc(im, x, y, 1.2, function(xx, yy, rr) return ramp(S, rr * 0.6 + (ang - 118) / 120, xx, yy) end) end
  -- front: fender, fork (gaiters + chrome sliders), disc, caliper
  for ang = 52, 142, 1.5 do   -- front fender: an arc hugging the wheel from the front-low edge over the top, so the tyre never pokes out above it
    local r = math.rad(ang); local x, y = 64 + 18.8 * math.cos(r), -16 - 18.8 * math.sin(r)
    disc(im, x, y, 1.5, function(xx, yy, rr, vy) return ramp(S, (ang - 52) / 90 * 0.5 + (vy + 1) * 0.25, xx, yy) end)
  end
  thick(im, 54, -45, 62, -22, 4, function(s, a) return a < 0.62 and chrome(s, a) or black(s) end)                          -- upper tubes + black gaiter
  thick(im, 62, -22, 64, -16, 3, chrome)
  disc(im, 64, -16, 7.5, function(x, y, r) if r > 0.82 then return STEEL[3] end return nil end)   -- drilled brake disc (ring only, the wheel shows through)
  fill(im, { { 66, -25 }, { 71, -22 }, { 72, -20 }, { 67, -21 } }, function() return "#ff7a3a" end)                          -- caliper
  -- headlight (chrome bucket, warm lens), mirror, handlebar, grip, brake lever
  disc(im, 58, -43, 7, function(x, y, r, vy, vx) return ramp(STEEL, 0.15 + (vy + 1) * 0.35 - vx * 0.15, x, y) end)
  disc(im, 59, -43, 4.6, function(x, y, r, vy, vx) if r < 0.35 and vy < 0 then return "#ffffff" end return ramp({ "#fffbe0", "#ffe88a", "#ffc24a" }, r + (vy + 1) * 0.15, x, y) end)
  thick(im, 53, -48, 55, -53, 2, function(s) return chrome(s, 0.5) end)
  thick(im, 55, -53, 49, -55, 3, function(s) return black(s) end); pt(im, 52, -55, DARK[1]); pt(im, 53, -55, DARK[1])         -- grip (the fist covers it)
  thick(im, 55, -53, 62, -55, 1, function() return STEEL[2] end)                                                              -- brake lever
  thick(im, 51, -55, 49, -61, 1, function() return STEEL[3] end); disc(im, 49, -63, 3, function(x, y, r) return r > 0.6 and STEEL[3] or "#ffb0e8" end)   -- mirror
  -- footpeg
  rect(im, X(29), Y(-19), X(36), Y(-18), C(STEEL[2])); rect(im, X(29), Y(-18), X(36), Y(-17), C(STEEL[4]))
  -- outline pass (dark ink around the silhouette, 1px)
  local ol = newImg()
  for y = 0, HH - 1 do for x = 0, WW - 1 do
    if getA(im, x, y) == 0 and (getA(im, x - 1, y) > 0 or getA(im, x + 1, y) > 0 or getA(im, x, y - 1) > 0 or getA(im, x, y + 1) > 0) then ol:drawPixel(x, y, C(INK)) end
  end end
  for y = 0, HH - 1 do for x = 0, WW - 1 do if getA(ol, x, y) > 0 then im:drawPixel(x, y, C(INK)) end end end
  return im
end

-- ------------------------------------------------------------------ neon underglow (additive layer)
local function under(scheme)
  local im = newImg(); local c = scheme == "pink" and { "#ff2fd0", "#ff7ae0" } or { "#27f0ff", "#8afaff" }
  for y = -4, 3 do for x = -6, 72 do
    local fx = 1 - math.abs(x - 33) / 40; local fy = 1 - math.abs(y - 1) / 5
    if fx > 0 and fy > 0 and dith(x, y, fx * fy * 0.9) then pt(im, x, y, y < 0 and c[2] or c[1]) end
  end end
  return im
end

local B1, B2, U = bike("pink"), bike("cyan"), under("pink")
local spr = saveLayers(out, { { "body_pink", B1 }, { "body_cyan", B2 }, { "under", U } }, { under = true })

-- ------------------------------------------------------------------ wheel: 6 frames (spokes advance 12 degrees each, 5 spokes = 72 degrees period)
local WS, R = 36, 16
local wspr = Sprite(WS, WS, ColorMode.RGB); wspr.filename = outWheel
for f = 0, 5 do
  local im = Image(WS, WS, ColorMode.RGB); im:clear(pc.rgba(0, 0, 0, 0))
  local cx, cy, ang = WS / 2 - 0.5, WS / 2 - 0.5, math.rad(f * 12)
  for y = 0, WS - 1 do for x = 0, WS - 1 do
    local dx, dy = x - cx, y - cy; local d = math.sqrt(dx * dx + dy * dy); local c
    if d <= R then
      if d > R - 4 then   -- tyre: black rubber with a sidewall highlight on the upper right
        c = (dx - dy > 0 and d > R - 1.5) and DARK[1] or (d > R - 1.2 and DARK[2] or DARK[3])
        if (math.floor(math.atan(dy, dx) * 9 / math.pi + f * 0.4) % 2 == 0) and d > R - 3.2 and d < R - 1.2 then c = DARK[2] end   -- tread blocks
      elseif d > R - 5.2 then c = "#27f0ff"            -- neon rim ring
      else
        c = "#1a1030"
        for k = 0, 4 do   -- 5 chrome spokes: distance to the spoke ray, lit edge toward the upper right
          local sa = ang + k * 2 * math.pi / 5; local ux, uy = math.cos(sa), math.sin(sa)
          local along = dx * ux + dy * uy; local perp = dx * -uy + dy * ux
          if along > 0 and math.abs(perp) < 1.05 then c = (perp < -0.2) and STEEL[1] or STEEL[2] elseif along > 0 and math.abs(perp) < 1.8 and c == "#1a1030" then c = "#3a2a66" end
        end
        if d < 3.6 then c = d < 1.7 and STEEL[1] or STEEL[3] end          -- hub
        
      end
      im:drawPixel(x, y, C(c))
    end
  end end
  -- outline
  local ol = Image(WS, WS, ColorMode.RGB); ol:clear(pc.rgba(0, 0, 0, 0))
  for y = 0, WS - 1 do for x = 0, WS - 1 do
    local function A(xx, yy) if xx < 0 or yy < 0 or xx >= WS or yy >= WS then return 0 end return pc.rgbaA(im:getPixel(xx, yy)) end
    if A(x, y) == 0 and (A(x - 1, y) > 0 or A(x + 1, y) > 0 or A(x, y - 1) > 0 or A(x, y + 1) > 0) then ol:drawPixel(x, y, C(INK)) end
  end end
  for y = 0, WS - 1 do for x = 0, WS - 1 do if pc.rgbaA(ol:getPixel(x, y)) > 0 then im:drawPixel(x, y, C(INK)) end end end
  local frame = (f == 0) and wspr.frames[1] or wspr:newFrame()
  wspr:newCel(wspr.layers[1], frame, im, Point(0, 0))
end
wspr:saveAs(outWheel)
local fm = io.open(metaOut, "w")
fm:write(string.format('{"w":%d,"h":%d,"ox":%d,"oy":%d,"wheel":%d,"wheelR":%d,"wheelFrames":6}', WW, HH, OX, OY, WS, R)); fm:close()
print("ending bike: 3 layers + 6 wheel frames")
