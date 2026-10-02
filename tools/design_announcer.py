"""Design the VEEXING FORCE announcer voice with ElevenLabs Voice Design (text -> custom voice), then save it to the account.
Prints the new voice id: put it in ANNOUNCER_VOICE (tools/make_sfx.py). The API key is read from .elevenlabs_key and never printed.
Several previews are generated; the deepest one (lowest median pitch, measured on the decoded preview) is kept.
usage: python tools/design_announcer.py            (writes the previews to assets/sfx/_voice_previews/ for listening)"""
import base64, json, os, subprocess, sys
from elevenlabs import ElevenLabs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESC = ('Extreme gaming announcer voice, echoing, heavily amplified, ultra-enthusiastic, dripping with 90s arcade hype. '
        'Deep, booming, gravelly and aggressive baritone, like a booming tournament loudspeaker in a massive digital arena, '
        'crackling with intense energy. Explosive and hyperbolic delivery.')
TEXT = ('Get ready for the fight of your life! Round one... FIGHT! Double kill! Triple kill! M-m-m-monster kill! '
        'Knockout! This is VEEXING FORCE! The crowd goes wild! Unstoppable! Legendary!')

def key():
    return os.environ.get('ELEVENLABS_API_KEY') or open(os.path.join(ROOT, '.elevenlabs_key'), encoding='utf8').read().strip()

if __name__ == '__main__':
    k = key(); c = ElevenLabs(api_key=k)
    out = os.path.join(ROOT, 'assets', 'sfx', '_voice_previews'); os.makedirs(out, exist_ok=True)
    try:
        r = c.text_to_voice.design(voice_description=DESC, text=TEXT, model_id='eleven_ttv_v3', guidance_scale=5, should_enhance=False)
    except Exception as e:
        m = str(e).replace(k, '***'); sys.exit('design error: ' + m[m.find('body'):][:400])
    previews = []
    for i, p in enumerate(r.previews):
        f = os.path.join(out, 'preview_%d.mp3' % i); open(f, 'wb').write(base64.b64decode(p.audio_base_64))
        previews.append({'i': i, 'id': p.generated_voice_id, 'file': f})
        print('preview', i, p.generated_voice_id, os.path.getsize(f) // 1024, 'KB')
    json.dump(previews, open(os.path.join(out, 'previews.json'), 'w'), indent=1)
    if '--save' in sys.argv:
        idx = int(sys.argv[sys.argv.index('--save') + 1])
        v = c.text_to_voice.create(voice_name='VEEX Arena Announcer', voice_description=DESC, generated_voice_id=previews[idx]['id'])
        print('saved voice id:', v.voice_id)
