"""Sound effects generated with ElevenLabs (text -> sound effect, skill: .agents/skills/sound-effects), then embedded for the game.
The API key is read from .elevenlabs_key (repo root, git-ignored) or the ELEVENLABS_API_KEY environment variable; it is never printed.
  assets/sfx/<name>.mp3   generated clips (kept: re-running only generates the missing ones)
  js/sfxData.js           base64 MP3s (the game runs from file://, where fetching separate audio files is blocked)
js/audio.js decodes them (Snd.sample) and falls back to the synthesized sound when a clip is missing.
usage: python tools/make_sfx.py            generate missing clips + embed
       python tools/make_sfx.py bin_break  regenerate these clips (costs ElevenLabs credits) + embed
       python tools/make_sfx.py --embed    embed only"""
import base64, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sfx')

# name: (prompt, duration in s, prompt influence 0..1[, loop])
SFX = {
    # trash bins (stage 1): 2 hits dent the bin, the 3rd breaks it. Three hit takes so repeated hits never sound identical.
    'bin_hit_a': ('Loud metal trash can being kicked hard, a big clanging bang of thin galvanized steel, ringing and wobbling, '
                  'street fight sound effect, very loud and close', 1.2, 0.5),
    'bin_hit_b': ('Loud metal garbage can struck with a fist, a bright tinny clang of thin steel followed by the lid rattling, '
                  'street fight sound effect, very loud and close', 1.2, 0.5),
    'bin_hit_c': ('Heavy impact on a steel dustbin, deep dented metal bang with a bright clank and the lid jumping and rattling, '
                  'street fight sound effect, very loud and close', 1.2, 0.5),
    'bin_break': ('Metal garbage can smashed and knocked over on wet asphalt: loud crunch of crumpling steel, the lid flies off and '
                  'clatters on the ground, the can rolls, trash and bottles spill out, arcade beat em up impact, no music, no voice', 1.8, 0.55),
    # steam manholes (all stages): warning (the lid shakes, ~1 s) then the blast (~1 s of active jet)
    'vent_warn': ('Heavy cast iron manhole cover rattling and vibrating on the street as steam pressure builds up underneath, '
                  'rising hiss and metallic clatter getting faster, tense, close, no music, no voice', 1.0, 0.6),
    'vent_burst': ('Powerful blast of pressurized steam erupting from a street manhole like a geyser, loud whoosh and roaring hiss, '
                   'the iron lid clanks, very loud and close, no music, no voice', 1.3, 0.6),
    # fire hydrant (stage 1): each hit, the valve bursting open, then the water jet as a seamless loop while it gushes
    'hydrant_hit': ('Loud heavy metal bang, a cast iron fire hydrant struck hard, solid iron clank with a bright ring, '
                    'street fight sound effect, very loud and close', 1.2, 0.5),
    'hydrant_burst': ('Fire hydrant cap bursting off, high pressure water exploding out in a violent spray and splash on the street, '
                      'very loud and close, no music, no voice', 1.5, 0.55),
    'hydrant_jet': ('Continuous high pressure water jet spraying from an open fire hydrant onto the street, steady roaring spray '
                    'and splashing, no music, no voice', 3.0, 0.5, True),
    # arcade cabinets (stage 2): 4 HP; hits, a faulty electric buzz loop once it is nearly broken, then the CRT implodes in an electric arc
    'cab_hit_a': ('Loud punch on a wooden arcade cabinet, a big hollow wooden bang with the CRT glass rattling and a short electric crackle, '
                  'street fight sound effect, very loud and close', 1.0, 0.5),
    'cab_hit_b': ('Loud kick on an arcade machine, heavy wooden thump, the screen glass buzzes and a quick electric zap sparks, '
                  'street fight sound effect, very loud and close', 1.0, 0.5),
    'cab_buzz': ('Loud faulty electrical buzzing and crackling from a broken arcade machine, unstable humming with random sparks, '
                 'steady, very close', 2.0, 0.5, True),
    'cab_break': ('Loud arcade machine destroyed: the CRT tube implodes with a glass crash, a huge electric arc discharge zaps and crackles, '
                  'sparks and a short explosion, very loud and close', 2.0, 0.5),
    # pinball bumpers (stage 2): rebound of a thrown enemy or of the hero's dash
    'bumper_a': ('Loud pinball pop bumper hit, a sharp electric solenoid thwack with a bright bell ding, arcade, very loud and close', 0.8, 0.6),
    'bumper_b': ('Loud pinball bumper bounce, punchy mechanical clack and a ringing chime, arcade, very loud and close', 0.8, 0.6),
    # beach ball (stage 3): kicked (2 takes); the wall rebounds replay these takes higher and softer (one timbre, no metal)
    'ball_kick_a': ('Loud hollow thwump of a big inflatable plastic beach ball being slapped, airy hollow plastic boom, light and bouncy, '
                    'no metal, sports sound effect, very loud and close', 1.2, 0.5),
    'ball_kick_b': ('Loud hollow bop of an inflatable beach ball kicked on the beach, soft airy plastic thump that resonates inside the ball, '
                    'no metal, sports sound effect, very loud and close', 1.2, 0.5),
    'ball_pop': ('Loud inflatable beach ball bursting, a sharp loud pop followed by a quick air hiss as it deflates, very loud and close', 1.0, 0.6),
    # pink cabriolet (stage 3): 8 HP; body hits, a short car alarm once it is about to blow (not a loop), then a huge explosion
    'car_hit_a': ('Loud punch on a car door, a heavy metal body panel denting with a deep thud and rattling chrome, '
                  'street fight sound effect, very loud and close', 1.0, 0.5),
    'car_hit_b': ('Loud kick on a car hood, crunching sheet metal bang and a little glass rattle, street fight sound effect, very loud and close', 1.0, 0.5),
    'car_alarm': ('1980s car alarm going off, fast whooping electronic siren from a parked car, loud and close', 2.5, 0.6),
    'car_explode': ('Huge car explosion, a massive fiery boom, the windshield shatters, metal debris and glass rain down, '
                    'cinematic action movie, very loud and close', 2.5, 0.5),
    # electrified floor plates (stage 4): charging (~0.9 s) then the discharge (~1.2 s of active plate); one-shots, no loop
    'plate_charge': ('Loud high voltage electricity charging up, a rising electric hum with crackling sparks building up, '
                     'sci-fi, very loud and close', 1.2, 0.5),
    'plate_zap': ('Loud violent electric discharge, a powerful high voltage zap with crackling arcs and buzzing sparks, '
                  'sci-fi, very loud and close', 1.3, 0.5),
    # server racks (stage 4): 5 HP; hits, a short fault alarm once nearly destroyed (not a loop), then the EMP crash
    'srv_hit_a': ('Loud punch on a metal server rack, heavy metal bang with hard drives clattering and a short electronic glitch beep, '
                  'very loud and close', 1.2, 0.5),
    'srv_hit_b': ('Loud kick on a computer server cabinet, metal clang, rattling equipment and a quick digital error chirp, '
                  'very loud and close', 1.2, 0.5),
    'srv_fault': ('Loud computer malfunction, fast error beeps, glitchy electronic stutter and a failing fan rattle, '
                  'sci-fi, very loud and close', 2.5, 0.5),
    'srv_crash': ('Loud electromagnetic pulse explosion of a supercomputer: a huge electric blast, sparks, then a long system power down '
                  'whine dropping in pitch with digital glitches, sci-fi, very loud and close', 2.5, 0.5),
    # MR. CHROME's floor laser (boss 4): lock-on during the red warning strip (~0.8 s), then the beam sweeping the floor (~0.5 s)
    'laser_warn': ('Loud sci-fi targeting lock-on: fast rising electronic charge-up whine with urgent alarm beeps, very loud and close', 1.0, 0.55),
    'laser_fire': ('Loud powerful sci-fi laser beam blast sweeping across the floor, searing energy buzz with a sharp zap attack, '
                   'very loud and close', 1.2, 0.5),
    # voices (non-verbal, sound-effect model): hero cries for VEEX (male) and ROXY (female), enemy K.O. groans
    'veex_kiai_a': ('Loud deep gravelly male warrior roar HAAH on a brutal punch, one short savage shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'veex_kiai_b': ('Loud deep husky male fighter battle shout HYAAH while smashing, one short ferocious yell, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'veex_fury': ('Loud deep gravelly male warrior bellowing a long furious war cry, powering up a super attack, epic and savage, aggressive fighting game voice, close, no music', 1.8, 0.6),
    'veex_hurt_a': ('Loud male grunt of pain right at the start, one short sharp oof when hit, fighting game voice, close, no music', 1.2, 0.5),
    'veex_hurt_b': ('Loud male gasp of pain when kicked, one short agh, fighting game voice, close, no music', 1.2, 0.5),
    'veex_ko': ('Loud male fighter scream as he is knocked out and falls, long aaargh, fighting game K.O. voice, close, no music', 1.8, 0.5),
    'roxy_kiai_a': ('Loud fierce female warrior shout HAAH on a brutal punch, one short savage yell, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'roxy_kiai_b': ('Loud fierce raspy female fighter battle cry HYAAH while kicking, one short ferocious shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'roxy_fury': ('Loud fierce female warrior long furious war cry, powering up a super attack, epic and savage, aggressive fighting game voice, close, no music', 1.8, 0.6),
    'roxy_hurt_a': ('Loud female grunt of pain when punched, one short ugh, fighting game voice, close, no music', 1.2, 0.5),
    'roxy_hurt_b': ('Loud female gasp of pain when kicked, one short ah, fighting game voice, close, no music', 1.2, 0.5),
    'roxy_ko': ('Loud female fighter scream as she is knocked out and falls, long aaah, fighting game K.O. voice, close, no music', 1.8, 0.5),
    'enemy_ko_a': ('Loud male street thug groan as he is knocked out, one short oof, fighting game voice, close, no music', 1.2, 0.5),
    'enemy_ko_b': ('Loud male thug cry of pain as he is sent flying, one short waagh, fighting game voice, close, no music', 1.2, 0.5),
    # --- more takes so the voices never loop audibly (the game picks a random take per family, never the same twice) ---
    'veex_kiai_c': ('Loud deep rough male brawler yell RAAH on a crushing kick, one short angry shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'veex_kiai_d': ('Loud deep male growl GRAH with a punch, one short gruff aggressive grunt shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'veex_kiai_e': ('Loud deep gravelly male finishing blow scream TAAAH, one short explosive savage roar, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'veex_atk_a': ('Male fighter short sharp exhale Huh when throwing a punch, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'veex_atk_b': ('Male fighter quick effort grunt Hup when kicking, very brief, fighting game voice, close, no music', 1.0, 0.55),
    'veex_atk_c': ('Male fighter short breath Ha when striking, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'veex_atk_d': ('Male fighter short hiss Tsh through the teeth when striking, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'veex_hurt_c': ('Loud male grunt of pain Hngh when hit in the face, one short, fighting game voice, close, no music', 1.2, 0.5),
    'veex_hurt_d': ('Loud male cry of pain Argh when hit hard, one short, fighting game voice, close, no music', 1.2, 0.5),
    'veex_ko_b': ('Loud male fighter long groan Noooo as he collapses defeated, K.O. voice, fighting game voice, close, no music', 1.8, 0.5),
    'veex_fury_b': ('Loud deep husky male fighter long rising primal roar full of rage, epic super move, aggressive fighting game voice, close, no music', 1.8, 0.6),
    'roxy_kiai_c': ('Loud fierce female brawler yell RAAH on a crushing kick, one short angry shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'roxy_kiai_d': ('Loud fierce female growling shout HAH with a punch, one short aggressive grunt, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'roxy_kiai_e': ('Loud fierce female finishing blow scream TAAAH, one short explosive savage shout, aggressive fighting game voice, close, no music', 1.2, 0.6),
    'roxy_atk_a': ('Female fighter short sharp exhale Hah when throwing a punch, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'roxy_atk_b': ('Female fighter quick effort grunt Hup when kicking, very brief, fighting game voice, close, no music', 1.0, 0.55),
    'roxy_atk_c': ('Female fighter short breath Ha when striking, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'roxy_atk_d': ('Female fighter short hiss Tsh when striking, very brief effort sound, fighting game voice, close, no music', 1.0, 0.55),
    'roxy_hurt_c': ('Loud female grunt of pain Ngh when hit in the face, one short, fighting game voice, close, no music', 1.2, 0.5),
    'roxy_hurt_d': ('Loud female cry of pain Ow when hit hard, one short, fighting game voice, close, no music', 1.2, 0.5),
    'roxy_ko_b': ('Loud female fighter long cry Nooo as she collapses defeated, K.O. voice, fighting game voice, close, no music', 1.8, 0.5),
    'roxy_fury_b': ('Loud fierce raspy female fighter long rising scream full of rage, epic super move, aggressive fighting game voice, close, no music', 1.8, 0.6),
    'enemy_ko_c': ('Loud male street punk scream Whoaa as he is thrown away, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemy_ko_d': ('Loud male thug moan Uuugh as he falls knocked out, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemy_ko_e': ('Loud deep male brute groan Graagh when defeated, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemy_ko_f': ('Loud male gangster yelp Aah as he is knocked out, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemy_hurt_a': ('Loud male thug grunt Ugh when punched, one very short, fighting game voice, close, no music', 1.0, 0.55),
    'enemy_hurt_b': ('Loud male thug grunt Oof when kicked, one very short, fighting game voice, close, no music', 1.0, 0.55),
    'enemy_hurt_c': ('Loud male thug pained grunt Agh when hit, one very short, fighting game voice, close, no music', 1.0, 0.55),
    'enemy_hurt_d': ('Loud deep male brute grunt Hmph when hit, one very short, fighting game voice, close, no music', 1.0, 0.55),
    'enemyf_ko_a': ('Loud female street fighter scream Aaah as she is knocked out, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemyf_ko_b': ('Loud female roller skater cry Whoaa as she is thrown away, one short, fighting game voice, close, no music', 1.2, 0.5),
    'enemyf_hurt_a': ('Loud female grunt Ugh when punched, one very short, fighting game voice, close, no music', 1.0, 0.55),
    'enemyf_hurt_b': ('Loud female gasp Ah when kicked, one very short, fighting game voice, close, no music', 1.0, 0.55),
    # enemy robots (stage 4)
    'robot_ko_a': ('Loud robot shutting down when destroyed: glitchy synthetic voice, power down whine, sci-fi, close, no music', 1.2, 0.5),
    'robot_ko_b': ('Loud android voice malfunction: distorted robotic groan and digital stutter fading out, sci-fi, close, no music', 1.2, 0.5),
    'robot_ko_c': ('Loud machine destroyed: robotic scream with bitcrushed distortion and sparks, sci-fi, close, no music', 1.2, 0.5),
    'robot_hurt_a': ('Loud robot hit: short metallic clank with a glitchy digital beep, sci-fi, close, no music', 1.0, 0.55),
    'robot_hurt_b': ('Loud android hit: short synthetic grunt with digital distortion, sci-fi, close, no music', 1.0, 0.55),
}
# announcer: real words -> ElevenLabs text to speech, model eleven_v3. A BARBARIAN announces the fight: deep, gravelly, gruff,
# roaring; combat calls are delivered in one breath (no written pauses). Voice "George": with the barbarian direction it is the deepest
# of the free default voices (median F0 ~99 Hz, measured). Generated 15 % faster, then played at x0.85 in the game: ~3 semitones
# deeper at the same pace (see ANN_RATE in js/audio.js). Auditions of the other voices: assets/sfx/_audition/.
ANNOUNCER_VOICE = 'JBFqnCBsd6RMkjVDRZzb'
ANNOUNCER_MODEL = 'eleven_v3'
ANNOUNCER_SPEED = 1.15
TTS = {
    'ann_fight': '[deep barbarian warlord, gravelly, roaring] [shouting] FIGHT!',
    'ann_fight_b': '[deep barbarian warlord, gravelly, roaring] [growling] READY? [shouting] FIGHT!',
    'ann_fight_c': '[deep barbarian warlord, gravelly, roaring] [shouting] BLOOD AND GLORY! FIGHT!',
    'ann_fight_d': "[deep barbarian warlord, gravelly, roaring] [shouting] LET'S ROCK!",
    'ann_warning': '[deep barbarian warlord, gravelly, roaring] [growling] WARNING! [shouting] A NEW CHALLENGER APPROACHES!',
    'ann_warning_b': '[deep barbarian warlord, gravelly, roaring] [shouting] BOSS FIGHT! BRING IT ON!',
    'ann_ko': '[deep barbarian warlord, gravelly, roaring] [shouting] K.O.!',
    'ann_ko_b': '[deep barbarian warlord, gravelly, roaring] [shouting] KNOCKOUT!',
    'ann_ko_c': '[deep barbarian warlord, gravelly, roaring] [shouting] CRUSHED!',
    'ann_stage_clear': '[deep barbarian warlord, gravelly, roaring] [shouting] STAGE CLEAR!',
    'ann_stage_clear_b': '[deep barbarian warlord, gravelly, roaring] [shouting] VICTORY!',
    'ann_stage_clear_c': '[deep barbarian warlord, gravelly, roaring] [shouting] THE STREETS ARE YOURS!',
    'ann_perfect': '[deep barbarian warlord, gravelly, roaring] [shouting] PERFECT!',
    'ann_perfect_b': '[deep barbarian warlord, gravelly, roaring] [laughs harshly] TOO SLOW!',
    'ann_perfect_c': '[deep barbarian warlord, gravelly, roaring] [shouting] UNTOUCHABLE!',
    'ann_game_over': '[deep barbarian warlord, gravelly, roaring] [growling] GAME OVER.',
    'ann_game_over_b': '[deep barbarian warlord, gravelly, roaring] [shouting] GET UP AND FIGHT!',
    'ann_you_win': '[deep barbarian warlord, gravelly, roaring] [shouting] YOU WIN!',
    'ann_you_win_b': '[deep barbarian warlord, gravelly, roaring] [shouting] LEGEND!',
    'ann_rank_a': '[deep barbarian warlord, gravelly, roaring] [shouting] GNARLY!',
    'ann_rank_s': '[deep barbarian warlord, gravelly, roaring] [shouting] TUBULAR!',
    'ann_rank_ss': '[deep barbarian warlord, gravelly, roaring] [shouting] MAXIMUM!',
    'ann_rank_sss': '[deep barbarian warlord, gravelly, roaring] [shouting] LEGENDARY!',
    'ann_multi2': '[deep barbarian warlord, gravelly, roaring] [shouting] DOUBLE KILL!',
    'ann_multi3': '[deep barbarian warlord, gravelly, roaring] [shouting] TRIPLE KILL!',
    'ann_multi4': '[deep barbarian warlord, gravelly, roaring] [shouting] M-M-M-MULTI KILL!',
    'ann_multi5': '[deep barbarian warlord, gravelly, roaring] [shouting] M-M-M-MONSTER KILL!',
    'ann_multi6': '[deep barbarian warlord, gravelly, roaring] [shouting] U-U-U-UNSTOPPABLE!',
}

def api_key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    p = os.path.join(ROOT, '.elevenlabs_key')
    if not k and os.path.exists(p): k = open(p, encoding='utf8').read().strip()
    if not k: sys.exit('no ElevenLabs key: put it in .elevenlabs_key (repo root, git-ignored) or ELEVENLABS_API_KEY')
    return k

def generate(names):
    from elevenlabs import ElevenLabs
    client = ElevenLabs(api_key=api_key())
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        prompt, dur, infl = SFX[n][:3]; loop = len(SFX[n]) > 3 and SFX[n][3]
        try:
            audio = client.text_to_sound_effects.convert(text=prompt, duration_seconds=dur, prompt_influence=infl, loop=loop, output_format='mp3_44100_128')
            data = b''.join(audio)
        except Exception as e:
            sys.exit('ElevenLabs error on %s: %s' % (n, str(e).replace(api_key(), '***')))
        open(os.path.join(OUT, n + '.mp3'), 'wb').write(data)
        print('generated', n, len(data) // 1024, 'KB')

def generate_tts(names):
    from elevenlabs import ElevenLabs
    client = ElevenLabs(api_key=api_key())
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        try:
            data = b''.join(client.text_to_speech.convert(voice_id=ANNOUNCER_VOICE, text=TTS[n], model_id=ANNOUNCER_MODEL, output_format='mp3_44100_128',
                                                            voice_settings={'stability': 0.0, 'similarity_boost': 0.85, 'speed': ANNOUNCER_SPEED}))   # v3: 0.0 = creative (most expressive)
        except Exception as e:
            msg = str(e).replace(api_key(), '***')
            if 'missing_permissions' in msg or 'text_to_speech' in msg:
                print('announcer skipped: the API key lacks the text_to_speech permission'); return
            sys.exit('ElevenLabs error on %s: %s' % (n, msg[msg.find('body'):][:300]))
        open(os.path.join(OUT, n + '.mp3'), 'wb').write(data)
        print('generated', n, len(data) // 1024, 'KB')

def embed():
    rows = []
    for n in list(SFX) + list(TTS):
        f = os.path.join(OUT, n + '.mp3')
        if os.path.exists(f): rows.append("  %s: '%s'" % (n, base64.b64encode(open(f, 'rb').read()).decode()))
    js = ('// generated by tools/make_sfx.py (ElevenLabs sound effects, sources in assets/sfx/) - do not edit\n'
          'const SFX_DATA = {\n%s\n};\n') % ',\n'.join(rows)
    open(os.path.join(ROOT, 'js', 'sfxData.js'), 'w').write(js)
    print('js/sfxData.js:', len(rows), 'clips,', len(js) // 1024, 'KB')

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--embed' not in sys.argv:
        todo = args or [n for n in list(SFX) + list(TTS) if not os.path.exists(os.path.join(OUT, n + '.mp3'))]
        bad = [n for n in todo if n not in SFX and n not in TTS]
        if bad: sys.exit('unknown sfx: ' + ', '.join(bad))
        if [n for n in todo if n in SFX]: generate([n for n in todo if n in SFX])
        if [n for n in todo if n in TTS]: generate_tts([n for n in todo if n in TTS])
    embed()
