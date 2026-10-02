"""Generates content/levels.json (authored level design) and validates solvability.
Run: python3 tools/build_levels.py   (no dependencies)
Mirrors the rules in docs/02-technical-spec.md §6 so the content team can edit and re-validate."""
import json, itertools, pathlib, argparse

N = lambda v: {"kind": "number", "value": v}
F = {"kind": "frog"}
W = lambda items: sum(1 if i["kind"] == "frog" else i["value"] for i in items)

levels = []
def add(world, index, mode, left, right, work, frogs, numbers, max_n, max_f, goal,
        eq=False, arrow=False, intro=None):
    levels.append({
        "id": f"w{world}-l{index}", "world": world, "index": index, "mode": mode,
        "fixed": {"left": left, "right": right}, "workPan": work,
        "tray": {"frogs": frogs, "numbers": numbers},
        "childLimits": {"maxNumbers": max_n, "maxFrogs": max_f},
        "goal": goal, "showEquation": eq, "guideArrow": arrow,
        "vo": {"intro": intro},
    })

BAL = {"type": "balance"}
# World 1 — Dawn Pond: count 1..5 with frogs
for i, n in enumerate([1, 2, 3, 4, 5, 3, 5, 4], 1):
    add(1, i, "count", [N(n)], [], "right", True, [], 0, 10, BAL,
        arrow=i <= 2, intro="intro_count_first" if i == 1 else "intro_count")
# World 2 — Flower Island: count 6..10, then first missing-part with frogs
for i, n in enumerate([6, 7, 8, 9, 10], 1):
    add(2, i, "count", [N(n)], [], "right", True, [], 0, 10, BAL, intro="intro_count")
for i, (t, r) in enumerate([(6, 2), (8, 5), (10, 6)], 6):
    add(2, i, "missing", [N(t)], [N(r)], "right", True, [], 0, 6, BAL, intro="intro_missing_frogs")
# World 3 — Forest: predict which side goes down
for i, (l, r) in enumerate([(9, 2), (1, 6), (8, 3), (5, 5), (4, 7), (6, 5), ("4f", 4), (9, 8)], 1):
    left = [F] * 4 if l == "4f" else [N(l)]
    add(3, i, "compare", left, [N(r)], None, False, [], 0, 0, {"type": "predict"}, intro="intro_compare")
# World 4 — Waterfall: number bonds
bonds = [  # target, fixed-on-work-pan, child numbers exactly, required solutions
    (3, [1], 1, 1), (4, [3], 1, 1), (5, [2], 1, 1), (6, [], 2, 1),
    (5, [], 2, 2), (7, [], 2, 2), (8, [], 2, 3), (10, [], 2, 3)]
for i, (t, fx, k, req) in enumerate(bonds, 1):
    add(4, i, "bond", [N(t)], [N(v) for v in fx], "right", False, list(range(1, t)), k, 0,
        {"type": "balanceMulti", "requiredSolutions": req, "childNumbersExactly": k},
        eq=True, intro="intro_bond_single" if k == 1 else "intro_bond_multi")
# World 5 — Glow Cave: missing part, equation visible
miss = [(7, 4, "f"), (9, 5, "f"), (10, 5, "f"), (8, 6, "n"), (6, 2, "n"), (10, 3, "n"), (9, 1, "n"), (10, 4, "b")]
for i, (t, r, how) in enumerate(miss, 1):
    frogs, nums = how in "fb", (list(range(1, 10)) if how in "nb" else [])
    add(5, i, "missing", [N(t)], [N(r)], "right", frogs, nums,
        1 if how in "nb" else 0, 6 if how in "fb" else 0, BAL, eq=True,
        intro="intro_missing_frogs" if how == "f" else "intro_missing_number")
# World 6 — Starry Sky: equality on both sides  a + b = c + ?
eqs = [((2, 3), 4, "f"), ((3, 4), 5, "f"), ((4, 4), 6, "n"), ((5, 2), 3, "n"),
       ((6, 3), 7, "n"), ((1, 8), 4, "n"), ((5, 5), 2, "n"), ((2, 7), 3, "n")]
for i, ((a, b), c, how) in enumerate(eqs, 1):
    add(6, i, "equation", [N(a), N(b)], [N(c)], "right", how == "f",
        [] if how == "f" else list(range(1, 10)), 0 if how == "f" else 1, 6 if how == "f" else 0,
        BAL, eq=True, intro="intro_equation")

# ---------- validation (mirrors spec §5–6) ----------
def cap_ok(items):
    n = sum(i["kind"] == "number" for i in items); f = len(items) - n
    if n and f: return n <= 2 and f <= 6
    return n <= 3 and f <= 10

def child_options(L):
    frogs = range(0, L["childLimits"]["maxFrogs"] + 1) if L["tray"]["frogs"] else [0]
    nums = sorted(set(L["tray"]["numbers"]))
    for k in range(0, L["childLimits"]["maxNumbers"] + 1):
        for combo in itertools.combinations_with_replacement(nums, k):
            for f in frogs:
                if k + f == 0: continue
                yield [N(v) for v in combo] + [F] * f

parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true', help='Validate the authored file without writing it')
parser.add_argument('--json', action='store_true', help='Print machine-readable solvability results')
args = parser.parse_args()
out = pathlib.Path(__file__).resolve().parent.parent / "content" / "levels.json"
if args.check:
    levels = json.loads(out.read_text(encoding="utf-8"))["levels"]
errors = []
rows = []
assert len(levels) == 48
for L in levels:
    other = "left" if L["workPan"] == "right" else "right"
    for side in ("left", "right"):
        if not cap_ok(L["fixed"][side]): errors.append(f"{L['id']} fixed {side} over capacity")
    g = L["goal"]["type"]
    if (L["mode"] == "compare") != (g == "predict") or (L["mode"] == "bond") != (g == "balanceMulti"):
        errors.append(f"{L['id']} mode/goal mismatch")
    if g == "predict":
        if not (L["fixed"]["left"] and L["fixed"]["right"]): errors.append(f"{L['id']} empty pan")
        if L["workPan"] is not None: errors.append(f"{L['id']} predict workPan must be null")
        rows.append({"id": L["id"], "mode": L["mode"], "need": 0, "solutions": 1, "ok": True})
        continue
    if L["workPan"] is None:
        errors.append(f"{L['id']} missing workPan"); continue
    need = W(L["fixed"][other]) - W(L["fixed"][L["workPan"]])
    if need <= 0: errors.append(f"{L['id']} need={need}"); continue
    sols = set()
    for opt in child_options(L):
        pan = L["fixed"][L["workPan"]] + opt
        if W(opt) != need or not cap_ok(pan): continue
        if g == "balanceMulti":
            if any(i["kind"] == "frog" for i in opt) or len(opt) != L["goal"]["childNumbersExactly"]: continue
            if any(i["kind"] != "number" for i in pan): continue
            key = "+".join(map(str, sorted(i["value"] for i in pan)))
            sols.add(key)
        else:
            sols.add(json.dumps(opt, sort_keys=True))
    required = L["goal"].get("requiredSolutions", 1)
    if len(sols) < required: errors.append(f"{L['id']} solutions {len(sols)} < {required}")
    rows.append({"id": L["id"], "mode": L["mode"], "need": need, "solutions": len(sols), "ok": len(sols) >= required})

if errors: raise SystemExit("INVALID:\n" + "\n".join(errors))
if not args.check:
    out.write_text(json.dumps({"version": 1, "levels": levels}, ensure_ascii=False, indent=2), encoding="utf-8")
if args.json:
    print(json.dumps(rows))
else:
    print(f"OK — {len(levels)} levels valid and solvable → {out}")
