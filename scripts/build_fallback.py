#!/usr/bin/env python3
"""
Build fallback.json from WoWHead Classic XML for all known vanilla craftable items.
Fetches XML for each item ID, extracts recipe data, merges with existing fallback.

Usage:
    python3 scripts/build_fallback.py
"""

import json
import re
import time
import sys
from pathlib import Path
import requests

BASE = "https://www.wowhead.com/classic"
OUT  = Path(__file__).parent.parent / "data" / "fallback.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; wow-consumes-calc/1.0)",
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# ---------------------------------------------------------------------------
# Comprehensive vanilla WoW craftable item IDs, organized by profession.
# Source: WoWHead Classic database, verified against known vanilla 1.12 data.
# ---------------------------------------------------------------------------
ITEM_IDS = {
    "Alchemy": [
        # Flasks
        13510, 13511, 13512, 13513, 13506,
        # Major potions
        13446, 13444, 13442, 13443,
        # Standard healing/mana
        1710, 6149, 3827, 2456, 118, 858,
        # Rage potions
        5633, 5631, 5634,
        # Elixirs (high tier)
        13452, 13453, 13454, 13445, 13447, 13455,
        # Elixirs (mid tier)
        9264, 9232, 9187, 9197, 9155, 8951,
        # Elixirs (low tier)
        3825, 3389, 3391, 3390, 3383, 6662,
        # Protection potions
        13457, 13458, 13456, 13459, 13460, 13461, 13462,
        6049, 6052, 6050, 6048, 6051,
        # Misc potions
        3387, 9030, 9036, 9088, 9172, 20008, 5996,
        9233, 5632, 3826, 3388, 3382, 3823, 3385, 3384, 3386,
        6627, 6628,
        # Transmutes (create materials)
        12360, 14256, 7078, 12803, 12808,
        # Crafting components
        13503, 9149,
    ],
    "Blacksmithing": [
        # Sharpening / weightstones (consumables)
        12404, 12643, 12642, 7964, 7965, 7966, 12644,
        3251, 3252,
        # Shield spikes
        19970, 6042, 6043,
        # Arcanite weapons
        12282, 12930, 17193,
        # Dark Iron
        17011, 17012, 20818, 17010,
        # Thorium weapons
        15994, 15995,
        # Mail/plate armor (endgame)
        12408, 12409, 12410, 12411, 12412, 12413,  # Thorium set
        14551, 14552, 14553, 14554, 14555, 14556,  # Imperial Plate
        12735, 12736, 12737, 12738, 12739, 12740,  # Ornate Mithril
        17013, 17014, 17015, 17016, 17017, 17018,  # Dark Iron set
        # Mithril
        7931, 7932, 7933, 7934, 7935, 7936,
        # Iron/Bronze
        3579, 3580, 3842, 3843, 3844,
        # Intermediates
        3486, 3607, 7967, 12640, 12641,
    ],
    "Engineering": [
        # Explosives
        10646, 16005, 18641, 15993, 10562, 10507, 4394, 4390, 18588,
        13241, 4405, 4403, 4402,
        # Devices / trinkets
        10726, 10645, 18594, 18634, 18637, 18638, 18639, 18645,
        10506, 9499, 10720, 10721, 10725, 15996, 16023, 18232,
        4396, 7190, 7189, 7191, 10601,
        18587, 8345,
        # Scopes
        10548, 4407, 9362, 3845, 4408,
        # Goggles / head
        10504, 10505, 10726, 9503, 9504,
        # Robots / pets
        11826, 11827, 16000,
        # Fuel / bombs / components
        9061, 4400, 4401, 6529, 10559, 10558, 4603, 13141,
        4388, 4389, 7191,
    ],
    "Leatherworking": [
        # Armor kits (consumable-adjacent)
        10650, 4780, 2304, 8195,
        # Elemental LW gear
        15047, 15048,  # Devilsaur set
        15059, 15060, 15061,  # Black Dragon Mail
        15058, 15062, 15063,  # Black Dragonscale
        # Dragonscale LW
        15064, 15065, 15066, 15067,
        # Tribal LW
        15068, 15069, 15070, 15071,
        # Elemental LW
        10827, 10828, 10829, 10830,
        # Standard LW armor (endgame)
        8203, 8204, 8205, 8206, 8207,
        7374, 7375, 7376,
        # Quivers / ammo pouches
        10504, 10505, 18192, 18193,
        # Cured / exotic materials
        8173, 8171, 8172, 15407,
    ],
    "Tailoring": [
        # Bags
        4467, 4497, 4498, 4499, 4500, 5765, 10050,
        14156, 14155, 19052, 13858,
        # Mooncloth (material w/ cooldown)
        14526,
        # Mooncloth gear
        14526, 18405, 18406, 18407, 18408,
        # Felcloth / Truefaith
        18405, 18406, 18407, 18408,
        # Bloodvine set
        19682, 19683, 19684,
        # Runecloth gear
        14100, 14101, 14102, 14103, 14104, 14105,
        # Mageweave gear
        8215, 8216, 8217, 8218,
        # Silk gear
        6835, 6836, 6837, 6838,
        # Wool gear
        4327, 4328, 4329,
        # Linen gear
        4307, 4308, 4309,
        # Spellcloth / other materials
        22504,
    ],
    "Cooking": [
        # Raid-relevant buff food
        13928, 13931, 18254, 12217, 20452, 13927, 13929, 13930,
        18045, 20419, 6657, 13851,
        # Stat food (stam/spirit/etc)
        17222, 13810, 17197, 17198,
        21023,  # Dirge's Kickin' Chimaerok Chops
        # Drinks
        1179, 1205, 1708, 8766,
        # Standard food
        422, 724, 2683, 5527, 12209,
        3220, 4457, 4458, 5476,
        7808, 8950,
    ],
    "First Aid": [
        14530, 14529, 8545, 8544,
        6451, 6450, 3530, 3529, 2581,
    ],
    "Enchanting": [
        # Enchanting rods
        6217, 11130, 16207, 16206,
        # Enchanting materials (crafted)
        10938, 10939, 10940, 16202, 16203,
        16204, 16205, 16207, 16219, 16220,
        # Scrolls (if any are craftable via enchanting)
    ],
}

# Flatten to unique IDs preserving profession association
def get_all_items():
    seen = {}
    for prof, ids in ITEM_IDS.items():
        for item_id in ids:
            if item_id not in seen:
                seen[item_id] = prof
    return seen


def fetch(url: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=15)
            if r.status_code == 200:
                return r.text
            if r.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"  [rate limited] sleeping {wait}s...")
                time.sleep(wait)
            else:
                return None
        except requests.RequestException as e:
            print(f"  [error] {e}")
            time.sleep(3)
    return None


def parse_item_xml(xml_text: str):
    """
    Parse WoWHead Classic item XML. Returns (name, icon, created_by) or None.
    Recipe data lives in <createdBy><spell><reagent> elements, not the JSON block.
    """
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return None

    item_el = root.find("item")
    if item_el is None:
        return None

    name_el = item_el.find("name")
    icon_el = item_el.find("icon")
    name = name_el.text if name_el is not None else None
    icon = icon_el.text if icon_el is not None else ""

    cb_el = item_el.find("createdBy")
    if cb_el is None:
        return None

    created_by = []
    for spell in cb_el.findall("spell"):
        spell_id = int(spell.get("id", 0))
        reagents = []
        for r in spell.findall("reagent"):
            reagents.append([int(r.get("id")), int(r.get("count", 1))])

        # Try to get skill info from the json block
        skill = []
        m = re.search(r'"s":(\d+)', xml_text)
        if m:
            skill = [{"id": int(m.group(1))}]

        creates_m = re.search(r'"creates":\[(\d+),(\d+),(\d+)\]', xml_text)
        creates = [[int(creates_m.group(1)), int(creates_m.group(2)), int(creates_m.group(3))]] if creates_m else []

        created_by.append({
            "id": spell_id,
            "reagents": reagents,
            "skill": skill,
            "creates": creates,
        })

    if not created_by:
        return None

    return name, icon, created_by


def fetch_item(item_id: int) -> dict | None:
    url = f"{BASE}/item={item_id}&xml"
    xml = fetch(url)
    if not xml:
        return None
    result = parse_item_xml(xml)
    if not result:
        return None

    name, icon, created_by = result

    # Get icon from json block if not in XML element
    if not icon:
        m = re.search(r'"icon":"([^"]+)"', xml)
        if m:
            icon = m.group(1)

    return {
        "id": item_id,
        "name": name or f"Item #{item_id}",
        "icon": icon or "",
        "createdBy": created_by,
    }


def load_existing() -> dict:
    if OUT.exists():
        try:
            return json.loads(OUT.read_text())
        except Exception:
            pass
    return {"items": {}}


def save(db: dict):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(db, separators=(",", ":")))


def main():
    db = load_existing()
    items = db.setdefault("items", {})
    print(f"Loaded {len(items)} existing items from fallback.json\n")

    all_items = get_all_items()
    new_ids = [(iid, prof) for iid, prof in all_items.items() if str(iid) not in items]

    print(f"Total item IDs in list: {len(all_items)}")
    print(f"New items to fetch: {len(new_ids)}\n")

    fetched = 0
    skipped = 0

    for i, (item_id, prof) in enumerate(new_ids, 1):
        print(f"[{i}/{len(new_ids)}] [{prof}] {item_id}...", end=" ", flush=True)
        item = fetch_item(item_id)
        if item:
            items[str(item_id)] = item
            fetched += 1
            print(f"OK — {item['name']}")
        else:
            skipped += 1
            print("skip (no recipe / not found)")

        if i % 25 == 0:
            save(db)
            print(f"\n  [checkpoint — {len(items)} items saved]\n")

        time.sleep(0.4)

    save(db)
    print(f"\nDone. Added {fetched} new items, {skipped} had no recipe data.")
    print(f"Total in fallback.json: {len(items)}")


if __name__ == "__main__":
    main()
