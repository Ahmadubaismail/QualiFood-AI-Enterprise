from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from config import Config
from database import init_db
from middleware.auth_middleware import require_auth
import auth
import ai
import inspection as inspection_service
import laboratory as lab_service
import inventory as inventory_service
import analytics as analytics_service
import reports as reports_service

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)  # allows the frontend dev server (:8080) to call this API (:5000)

with app.app_context():
    init_db()

# ---- Auth (public) ----
@app.post("/api/auth/register")
def register():
    data = request.get_json(force=True)
    user = auth.register_user(data["email"], data["password"], data.get("role", "inspector"))
    return jsonify(user), 201

@app.post("/api/auth/login")
def login():
    data = request.get_json(force=True)
    result = auth.authenticate(data["email"], data["password"])
    if not result:
        return jsonify({"error": "Imel ko kalmar sirri ba daidai ba"}), 401
    return jsonify(result)

# ---- AI / RAG (protected) ----
@app.post("/api/ai/query")
@require_auth
def ai_query():
    data = request.get_json(force=True)
    return jsonify(ai.ask(data.get("question", "")))

# ---- Inspections (protected) ----
@app.get("/api/inspections")
@require_auth
def get_inspections():
    return jsonify(inspection_service.list_inspections())

@app.post("/api/inspections")
@require_auth
def post_inspection():
    data = request.get_json(force=True)
    record = inspection_service.create_inspection(
        data["site"], data.get("inspector_id"), data.get("findings", []), data.get("risk", "safe")
    )
    return jsonify(record), 201

# ---- Laboratory (protected) ----
@app.get("/api/samples")
@require_auth
def get_samples():
    return jsonify(lab_service.list_samples())

@app.post("/api/samples")
@require_auth
def post_sample():
    data = request.get_json(force=True)
    return jsonify(lab_service.log_sample(data["name"], data.get("inspection_id"), data.get("result", "pending"))), 201

# ---- Inventory (protected) ----
@app.get("/api/inventory")
@require_auth
def get_inventory():
    return jsonify(inventory_service.list_items())

@app.post("/api/inventory")
@require_auth
def post_inventory():
    data = request.get_json(force=True)
    return jsonify(inventory_service.add_item(data["name"], data["qty"], data.get("unit", "kg"), data.get("expiry"))), 201

# ---- Analytics (protected) ----
@app.get("/api/analytics/risk-summary")
@require_auth
def get_risk_summary():
    return jsonify(analytics_service.risk_summary())

@app.get("/api/analytics/compliance")
@require_auth
def get_compliance():
    return jsonify({"compliance_rate": analytics_service.compliance_rate()})

# ---- Reports (protected) ----
@app.get("/api/reports/<inspection_id>/pdf")
@require_auth
def get_report_pdf(inspection_id):
    path = reports_service.generate_pdf(inspection_id)
    return send_file(path, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=Config.DEBUG, port=5000)
