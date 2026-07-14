import os
import time
import uuid
from database import get_connection

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


def _get_inspection(inspection_id: str):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM inspections WHERE id = ?", (inspection_id,)
        ).fetchone()
        return row


def _get_samples_for_inspection(inspection_id: str):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM samples WHERE inspection_id = ? ORDER BY tested_at DESC",
            (inspection_id,),
        ).fetchall()


def generate_pdf(inspection_id: str) -> str:
    """Render a real PDF inspection report using reportlab.

    Requires: pip install reportlab  (see backend/requirements.txt)
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    import json

    inspection = _get_inspection(inspection_id)
    if inspection is None:
        raise ValueError(f"No inspection found with id {inspection_id}")

    findings = json.loads(inspection.get("findings") or "[]")
    samples = _get_samples_for_inspection(inspection_id)

    risk_colors = {
        "safe": colors.HexColor("#2E7D5B"),
        "caution": colors.HexColor("#C68A1E"),
        "danger": colors.HexColor("#B23A2E"),
    }
    risk = inspection.get("risk", "safe")
    risk_color = risk_colors.get(risk, colors.grey)

    out_dir = os.path.join(REPORTS_DIR, "pdf")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{inspection_id}.pdf")

    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    y = height - margin

    # ---- Header ----
    c.setFillColor(colors.HexColor("#131A20"))
    c.rect(0, height - 30 * mm, width, 30 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, height - 15 * mm, "QualiFood AI — Inspection Report")
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 22 * mm, f"Report generated: {time.ctime()}")
    y = height - 40 * mm

    # ---- Summary block ----
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Inspection Summary")
    y -= 8 * mm

    c.setFont("Helvetica", 10)
    rows = [
        ("Inspection ID", inspection.get("id", "")),
        ("Site", inspection.get("site", "")),
        ("Inspector ID", inspection.get("inspector_id", "") or "—"),
        ("Date", inspection.get("date", "")),
    ]
    for label, value in rows:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, f"{label}:")
        c.setFont("Helvetica", 10)
        c.drawString(margin + 40 * mm, y, str(value))
        y -= 6 * mm

    # ---- Risk badge ----
    y -= 4 * mm
    c.setFillColor(risk_color)
    c.roundRect(margin, y - 6 * mm, 35 * mm, 8 * mm, 2 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(margin + 17.5 * mm, y - 4 * mm, risk.upper())
    c.setFillColor(colors.black)
    y -= 16 * mm

    # ---- Findings ----
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Findings / Checklist Items")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    if findings:
        for item in findings:
            text = item if isinstance(item, str) else item.get("label", str(item))
            c.drawString(margin, y, f"• {text}")
            y -= 6 * mm
            if y < margin + 30 * mm:
                c.showPage()
                y = height - margin
    else:
        c.drawString(margin, y, "No findings recorded.")
        y -= 6 * mm

    # ---- Lab samples ----
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Laboratory Samples")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    if samples:
        for s in samples:
            c.drawString(margin, y, f"• {s['name']} — result: {s['result']} ({s['tested_at']})")
            y -= 6 * mm
            if y < margin + 20 * mm:
                c.showPage()
                y = height - margin
    else:
        c.drawString(margin, y, "No lab samples linked to this inspection.")

    c.showPage()
    c.save()

    with get_connection() as conn:
        report_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO reports (id, inspection_id, format, generated_at, path) VALUES (?, ?, ?, ?, ?)",
            (report_id, inspection_id, "pdf", str(int(time.time())), path),
        )
    return path
