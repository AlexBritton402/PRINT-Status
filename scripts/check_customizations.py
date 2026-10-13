#!/usr/bin/env python3
"""Check PRINT Status customizations against the current Horizon tree.

Exit 1 if any check fails. Prints PASS or FAIL for each check.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPGRADING = ROOT / "UPGRADING.md"

failures = 0


def report(ok: bool, message: str) -> None:
    global failures
    print(("PASS" if ok else "FAIL") + "  " + message)
    if not ok:
        failures += 1


def custom_files_from_upgrading(text: str) -> list[str]:
    """First-column backtick paths from the custom-file table."""
    files: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if not cells:
            continue
        cell = cells[0]
        if len(cell) < 2 or not (cell.startswith("`") and cell.endswith("`")):
            continue
        path = cell[1:-1]
        if path.endswith((".liquid", ".json")):
            files.append(path)
    return files


def strip_leading_comment(text: str) -> str:
    body = text.lstrip()
    if body.startswith("/*"):
        end = body.find("*/")
        if end == -1:
            raise ValueError("unclosed /* comment")
        body = body[end + 2 :].lstrip()
    return body


def load_template(path: Path) -> dict:
    return json.loads(strip_leading_comment(path.read_text()))


def walk_typed(node, found: list) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("type"), str):
            found.append(node)
        for value in node.values():
            walk_typed(value, found)
    elif isinstance(node, list):
        for value in node:
            walk_typed(value, found)


def local_block_types() -> set[str]:
    """Block types declared inline in a section's (or block's) own schema.
    These are valid without a matching file, e.g. the 'service' block defined
    inside sections/service-paths.liquid, just like Horizon's own section blocks.
    """
    declared: set[str] = set()
    for folder in ("sections", "blocks"):
        for path in (ROOT / folder).glob("*.liquid"):
            body = schema_body(path)
            if not body:
                continue
            try:
                schema = json.loads(body)
            except (json.JSONDecodeError, ValueError):
                continue
            for block in schema.get("blocks", []) or []:
                if isinstance(block, dict) and isinstance(block.get("type"), str):
                    declared.add(block["type"])
    return declared


def referenced_type_ok(type_name: str, local_types: set[str]) -> bool:
    """Section/block types must exist as files, be declared inline in a section
    schema, or be an app/@ platform target."""
    if type_name.startswith("shopify://apps/"):
        return True
    # @theme and @app are platform targets, not theme files.
    if type_name.startswith("@"):
        return True
    # Private types keep the underscore: blocks/_announcement.liquid.
    if not type_name or "/" in type_name or "\\" in type_name or ".." in type_name:
        return False
    if type_name in local_types:
        return True
    filename = f"{type_name}.liquid"
    return (ROOT / "sections" / filename).is_file() or (ROOT / "blocks" / filename).is_file()


def schema_body(path: Path) -> str | None:
    text = path.read_text()
    start = text.find("{% schema %}")
    end = text.find("{% endschema %}")
    if start == -1 or end == -1 or end < start:
        return None
    return text[start + len("{% schema %}") : end]


def main() -> int:
    if not UPGRADING.is_file():
        report(False, "UPGRADING.md exists")
        print(f"\n{failures} failed")
        return 1

    report(True, "UPGRADING.md exists")
    files = custom_files_from_upgrading(UPGRADING.read_text())
    report(bool(files), f"UPGRADING.md lists custom files ({len(files)} found)")

    for rel in files:
        report((ROOT / rel).is_file(), f"custom file exists: {rel}")

    templates = sorted((ROOT / "templates").glob("*.json"))
    report(bool(templates), "templates/*.json files found")
    parsed: dict[str, dict] = {}
    for path in templates:
        rel = str(path.relative_to(ROOT))
        try:
            parsed[rel] = load_template(path)
        except (json.JSONDecodeError, ValueError, OSError) as exc:
            report(False, f"{rel} parses as JSON ({exc})")
        else:
            report(True, f"{rel} parses as JSON")

    product_rel = "templates/product.company.json"
    product = parsed.get(product_rel)
    if product is None:
        report(False, f"{product_rel} available for content checks")
    else:
        typed: list = []
        walk_typed(product, typed)
        app_types = [
            block["type"]
            for block in typed
            if block["type"].startswith("shopify://apps/")
        ]
        report(not app_types, "product.company.json has no shopify://apps/ block")
        section_types = [
            section.get("type")
            for section in product.get("sections", {}).values()
            if isinstance(section, dict)
        ]
        report(
            "product-recommendations" not in section_types,
            "product.company.json has no product-recommendations section",
        )
        for block_type in ("add-to-cart", "quantity"):
            matches = [block for block in typed if block.get("type") == block_type]
            disabled = [block for block in matches if block.get("disabled") is True]
            report(
                bool(matches) and not disabled,
                f"product.company.json {block_type} present and not disabled",
            )

    collection_rel = "templates/collection.company.json"
    collection = parsed.get(collection_rel)
    if collection is None:
        report(False, f"{collection_rel} available for content checks")
    else:
        section_types = {
            section.get("type")
            for section in collection.get("sections", {}).values()
            if isinstance(section, dict)
        }
        needed = {"company-hero", "company-promo", "main-collection"}
        missing = needed - section_types
        report(
            not missing,
            "collection.company.json uses company-hero, company-promo, main-collection"
            + (f" (missing {', '.join(sorted(missing))})" if missing else ""),
        )

    logo_path = ROOT / "blocks" / "_header-logo.liquid"
    logo_text = logo_path.read_text() if logo_path.is_file() else ""
    report(
        "'logo.png' | asset_url" in logo_text,
        "blocks/_header-logo.liquid keeps the bundled-logo fallback",
    )

    details_path = ROOT / "blocks" / "_product-details.liquid"
    details_schema = schema_body(details_path) if details_path.is_file() else None
    report(
        details_schema is not None and '"type": "@theme"' in details_schema,
        "blocks/_product-details.liquid schema lists @theme",
    )

    buy_path = ROOT / "blocks" / "buy-buttons.liquid"
    buy_text = buy_path.read_text() if buy_path.is_file() else ""
    has_quantity = "type: 'quantity'" in buy_text or '"type": "quantity"' in buy_text
    has_add = "type: 'add-to-cart'" in buy_text or '"type": "add-to-cart"' in buy_text
    report(
        has_quantity and has_add,
        "blocks/buy-buttons.liquid references add-to-cart and quantity blocks",
    )

    missing_types: list[str] = []
    local_types = local_block_types()
    type_sources: list[tuple[str, dict]] = list(parsed.items())
    for path in sorted((ROOT / "sections").glob("*-group.json")):
        rel = str(path.relative_to(ROOT))
        try:
            type_sources.append((rel, load_template(path)))
        except (json.JSONDecodeError, ValueError, OSError) as exc:
            missing_types.append(f"{rel} ({exc})")
    for rel, data in type_sources:
        typed: list = []
        walk_typed(data, typed)
        for node in typed:
            type_name = node["type"]
            if not referenced_type_ok(type_name, local_types):
                missing_types.append(f"{rel}: {type_name}")
    report(
        not missing_types,
        "template and section-group types resolve to section/block files"
        + (f" ({'; '.join(missing_types)})" if missing_types else ""),
    )

    print(f"\n{failures} failed" if failures else "\nall checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
