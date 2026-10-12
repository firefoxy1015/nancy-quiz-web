# -*- coding: utf-8 -*-
"""Model channel. Primary: cc-vibe (Anthropic-native passthrough). Fallback: official API.

Verified behaviour of cc-vibe (2026-10-11): /v1/messages works with x-api-key,
tool_use + strict schemas pass through, output_config.format and mid-conversation
system messages do NOT, so everything structured goes through tools and engine
notes ride inside the user turn.
"""
import json, os, time
import anthropic

CHANNELS = []
if os.environ.get('CCVIBE_API_KEY'):
    CHANNELS.append({'name': 'cc-vibe', 'client': anthropic.Anthropic(api_key=os.environ['CCVIBE_API_KEY'],
                                                                      base_url=os.environ.get('CCVIBE_BASE_URL', 'https://cc-vibe.com'),
                                                                      max_retries=1, timeout=120.0)})
if os.environ.get('CCVIBE_BACKUP_KEY'):   # same relay, second key: used when the first hits its daily limit
    CHANNELS.append({'name': 'cc-vibe-backup', 'client': anthropic.Anthropic(api_key=os.environ['CCVIBE_BACKUP_KEY'],
                                                                             base_url=os.environ.get('CCVIBE_BASE_URL', 'https://cc-vibe.com'),
                                                                             max_retries=1, timeout=120.0)})
if os.environ.get('ANTHROPIC_API_KEY'):
    CHANNELS.append({'name': 'anthropic', 'client': anthropic.Anthropic(max_retries=1, timeout=120.0)})

MODEL = os.environ.get('EXAMINER_MODEL', 'claude-opus-5-5')
FINISH_MODEL = os.environ.get('EXAMINER_FINISH_MODEL', MODEL)
_dead = {}   # channel name -> unix time until which it is skipped


def _daily(e):
    m = str(e).lower()
    return 'daily' in m and 'limit' in m


def _call(fn):
    last = None
    for ch in CHANNELS:
        if _dead.get(ch['name'], 0) > time.time():
            continue
        try:
            return fn(ch['client']), ch['name']
        except anthropic.AuthenticationError as e:
            _dead[ch['name']] = time.time() + 600; last = e
        except anthropic.RateLimitError as e:
            _dead[ch['name']] = time.time() + (1800 if _daily(e) else 60); last = e
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                _dead[ch['name']] = time.time() + 30
            elif _daily(e):
                _dead[ch['name']] = time.time() + 1800   # daily quota gone: stop trying this key for half an hour
            last = e
        except anthropic.APIConnectionError as e:
            _dead[ch['name']] = time.time() + 30; last = e
    raise RuntimeError(f'no model channel available: {last}')


def tool_call(system, messages, tool, model=None, max_tokens=2000):
    """Ask the model to answer via one tool; returns (input dict, channel). Retries once if it answers in prose."""
    def go(client, msgs):
        return client.messages.create(model=model or MODEL, max_tokens=max_tokens, system=system, messages=msgs, tools=[tool])
    resp, ch = _call(lambda c: go(c, messages))
    blocks = [b for b in resp.content if b.type == 'tool_use' and b.name == tool['name']]
    if not blocks and resp.stop_reason != 'refusal':
        nudge = messages + [{'role': 'assistant', 'content': ''.join(b.text for b in resp.content if b.type == 'text') or '(no tool call)'},
                            {'role': 'user', 'content': f'[ENGINE] You must respond by calling the {tool["name"]} tool, nothing else.'}]
        resp, ch = _call(lambda c: go(c, nudge))
        blocks = [b for b in resp.content if b.type == 'tool_use' and b.name == tool['name']]
    if resp.stop_reason == 'refusal':
        return None, ch, 'refusal'
    if not blocks:
        return None, ch, 'no-tool'
    inp = blocks[0].input
    if isinstance(inp, str):
        inp = json.loads(inp)
    return inp, ch, 'ok'
