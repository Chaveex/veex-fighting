-- Run by Aseprite in batch mode: aseprite -b hero_src.aseprite --script-param out=<path> --script hero_finalize.lua
-- RGBA (layers: body + rim) -> indexed palette sprite, saved as the final editable hero.aseprite
local spr = app.sprite
local out = app.params["out"]
if not spr then error("no sprite loaded") end
app.command.ColorQuantization{ ui = false, maxColors = 200, withAlpha = false }
app.command.ChangePixelFormat{ format = "indexed", dithering = "none" }
spr:saveAs(out)
print("hero finalised: " .. #spr.frames .. " frames, " .. #spr.layers .. " layers, " .. #spr.palettes[1] .. " colours")
