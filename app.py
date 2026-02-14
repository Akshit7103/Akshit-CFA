from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os

app = Flask(__name__)

# ── Database config ──────────────────────────────────────────────────
database_url = os.environ.get("DATABASE_URL", "sqlite:///progress.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)


# ── Models ───────────────────────────────────────────────────────────
class ChecklistItem(db.Model):
    __tablename__ = "checklist_items"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(10), nullable=False)
    done = db.Column(db.Boolean, default=False)
    __table_args__ = (db.UniqueConstraint("key", "category"),)


class Score(db.Model):
    __tablename__ = "scores"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), default="")
    date = db.Column(db.String(20), default="")
    score = db.Column(db.Float, default=0)
    notes = db.Column(db.String(500), default="")


class PlannerItem(db.Model):
    __tablename__ = "planner_items"
    id = db.Column(db.Integer, primary_key=True)
    position = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    days = db.Column(db.Integer, nullable=False)
    topic_idx = db.Column(db.Integer, nullable=True)  # null for Review


# ── Default planner data ─────────────────────────────────────────────
DEFAULT_PLANNER = [
    {"pos": 0,  "name": "Quantitative Methods",        "start": "2026-02-08", "days": 16, "topic_idx": 0},
    {"pos": 1,  "name": "Economics",                    "start": "2026-02-24", "days": 15, "topic_idx": 1},
    {"pos": 2,  "name": "Corporate Issuers",            "start": "2026-03-11", "days": 12, "topic_idx": 2},
    {"pos": 3,  "name": "Financial Statement Analysis", "start": "2026-03-23", "days": 25, "topic_idx": 3},
    {"pos": 4,  "name": "Equity Investments",           "start": "2026-04-17", "days": 19, "topic_idx": 4},
    {"pos": 5,  "name": "Fixed Income",                 "start": "2026-05-06", "days": 27, "topic_idx": 5},
    {"pos": 6,  "name": "Derivatives",                  "start": "2026-06-02", "days": 11, "topic_idx": 6},
    {"pos": 7,  "name": "Alternative Investments",      "start": "2026-06-13", "days": 11, "topic_idx": 7},
    {"pos": 8,  "name": "Portfolio Management",         "start": "2026-06-24", "days": 14, "topic_idx": 8},
    {"pos": 9,  "name": "Ethics",                       "start": "2026-07-08", "days": 15, "topic_idx": 9},
    {"pos": 10, "name": "Review",                       "start": "2026-07-23", "days": 30, "topic_idx": None},
]


def seed_planner():
    """Insert default planner rows if table is empty."""
    if PlannerItem.query.count() == 0:
        for p in DEFAULT_PLANNER:
            db.session.add(PlannerItem(
                position=p["pos"], name=p["name"],
                start_date=p["start"], days=p["days"],
                topic_idx=p["topic_idx"],
            ))
        db.session.commit()


def cascade_dates(items):
    """Recalculate start dates so each item starts the day after the previous ends."""
    for i in range(1, len(items)):
        prev = items[i - 1]
        prev_start = datetime.strptime(prev.start_date, "%Y-%m-%d")
        prev_end = prev_start + timedelta(days=prev.days)
        items[i].start_date = prev_end.strftime("%Y-%m-%d")
    db.session.commit()


def get_ordered_planner():
    return PlannerItem.query.order_by(PlannerItem.position).all()


# Create tables + seed
with app.app_context():
    db.create_all()
    seed_planner()


# ── All CFA Level I study data ──────────────────────────────────────
TOPICS = [
    {
        "name": "Quantitative Methods",
        "mm_prereqs": ["Prerequisites"],
        "readings": [
            "Rates and Returns",
            "Time Value of Money in Finance",
            "Statistical Measures of Asset Returns",
            "Probability Trees and Conditional Expectations",
            "Portfolio Mathematics",
            "Simulation Methods",
            "Estimation and Inference",
            "Hypothesis Testing",
            "Parametric and Non-Parametric Tests of Independence",
            "Simple Linear Regression",
            "Introduction to Big Data Techniques",
        ],
    },
    {
        "name": "Economics",
        "mm_prereqs": ["Prerequisites"],
        "readings": [
            "The Firm and Market Structures",
            "Understanding Business Cycles",
            "Fiscal Policy",
            "Monetary Policy",
            "Introduction to Geopolitics",
            "International Trade",
            "Capital Flows and the FX Market",
            "Exchange Rate Calculations",
        ],
    },
    {
        "name": "Corporate Issuers",
        "readings": [
            "Organizational Forms, Corporate Issuer Features, and Ownership",
            "Investors and Other Stakeholders",
            "Corporate Governance: Conflicts, Mechanisms, Risks, and Benefits",
            "Working Capital and Liquidity",
            "Capital Investments",
            "Capital Structure",
            "Business Models",
        ],
    },
    {
        "name": "Financial Statement Analysis",
        "mm_prereqs": ["Prerequisites"],
        "readings": [
            "Introduction to Financial Statement Analysis",
            "Analyzing Income Statements",
            "Analyzing Balance Sheets",
            "Analyzing Statements of Cash Flows I",
            "Analyzing Statements of Cash Flows II",
            "Analysis of Inventories",
            "Analysis of Long-Term Assets",
            "Topics in Long-Term Liabilities and Equity",
            "Analysis of Income Taxes",
            "Financial Reporting Quality",
            "Financial Analysis Techniques",
            "Introduction to Financial Statement Modeling",
        ],
    },
    {
        "name": "Equity Investments",
        "readings": [
            "Market Organization and Structure",
            "Security Market Indexes",
            "Market Efficiency",
            "Overview of Equity Securities",
            "Company Analysis: Past and Present",
            "Industry and Competitive Analysis",
            "Company Analysis: Forecasting",
            "Equity Valuation: Concepts and Basic Tools",
        ],
    },
    {
        "name": "Fixed Income",
        "readings": [
            "Fixed-Income Instrument Features",
            "Fixed-Income Cash Flows and Types",
            "Fixed-Income Issuance and Trading",
            "Fixed-Income Markets for Corporate Issuers",
            "Fixed-Income Markets for Government Issuers",
            "Introduction to Fixed-Income Valuation",
            "Yields and Yield Spreads",
            "The Term Structure of Interest Rates",
            "Interest Rate Risk and Return",
            "Credit Risk",
            "Asset-Backed Securities",
        ],
    },
    {
        "name": "Derivatives",
        "readings": [
            "Derivative Instrument and Derivative Market Features",
            "Forward Commitment and Contingent Claim Features and Instruments",
            "Derivative Benefits, Risks, and Issuer and Investor Uses",
            "Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
            "Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities",
            "Pricing and Valuation of Futures Contracts",
            "Pricing and Valuation of Interest Rates and Other Swaps",
            "Pricing and Valuation of Options",
            "Option Replication Using Put\u2013Call Parity",
            "Valuing a Derivative Using a One-Period Binomial Model",
        ],
    },
    {
        "name": "Alternative Investments",
        "readings": [
            "Alternative Investment Features, Methods, and Structures",
            "Alternative Investment Performance and Returns",
            "Investments in Private Capital: Equity and Debt",
            "Real Estate and Infrastructure",
            "Natural Resources",
            "Hedge Funds",
            "Introduction to Digital Assets",
        ],
    },
    {
        "name": "Portfolio Management",
        "readings": [
            "Portfolio Risk and Return: Part I",
            "Portfolio Risk and Return: Part II",
            "Portfolio Management: An Overview",
            "Basics of Portfolio Planning and Construction",
            "The Behavioral Biases of Individuals",
            "Introduction to Risk Management",
            "Technical Analysis",
            "Fintech in Investment Management",
        ],
    },
    {
        "name": "Ethics & Professional Standards",
        "readings": [
            "Ethics and Trust in the Investment Profession",
            "Code of Ethics and Standards of Professional Conduct",
            "Guidance for Standards I\u2013VII",
            "Introduction to the Global Investment Performance Standards (GIPS)",
            "Ethics Application",
        ],
    },
]


# ── Routes ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/topics")
def api_topics():
    return jsonify(TOPICS)


@app.route("/api/progress")
def api_progress():
    items = ChecklistItem.query.all()
    checklists = {}
    for item in items:
        if item.key not in checklists:
            checklists[item.key] = {"videos": False, "kaplan": False, "cfai": False}
        checklists[item.key][item.category] = item.done
    return jsonify({"checklists": checklists})


@app.route("/api/toggle", methods=["POST"])
def api_toggle():
    body = request.json
    key = body["key"]
    category = body["cat"]
    item = ChecklistItem.query.filter_by(key=key, category=category).first()
    if item is None:
        item = ChecklistItem(key=key, category=category, done=True)
        db.session.add(item)
    else:
        item.done = not item.done
    db.session.commit()
    return jsonify({"ok": True, "value": item.done})


# ── Planner API ──────────────────────────────────────────────────────

@app.route("/api/planner")
def api_planner_get():
    items = get_ordered_planner()
    result = []
    for it in items:
        start = datetime.strptime(it.start_date, "%Y-%m-%d")
        end = start + timedelta(days=it.days - 1)
        result.append({
            "id": it.id,
            "position": it.position,
            "name": it.name,
            "start": it.start_date,
            "end": end.strftime("%Y-%m-%d"),
            "days": it.days,
            "topic_idx": it.topic_idx,
        })
    return jsonify(result)


@app.route("/api/planner/update", methods=["POST"])
def api_planner_update():
    body = request.json
    item_id = body["id"]
    item = PlannerItem.query.get(item_id)
    if not item:
        return jsonify({"ok": False}), 404

    if "days" in body:
        item.days = max(1, body["days"])
    if "start" in body:
        item.start_date = body["start"]

    db.session.commit()

    # Cascade all dates after this item
    items = get_ordered_planner()
    cascade_dates(items)

    return api_planner_get()


@app.route("/api/planner/reorder", methods=["POST"])
def api_planner_reorder():
    body = request.json
    item_id = body["id"]
    direction = body["direction"]  # "up" or "down"

    items = get_ordered_planner()
    idx = next((i for i, it in enumerate(items) if it.id == item_id), None)
    if idx is None:
        return jsonify({"ok": False}), 404

    if direction == "up" and idx > 0:
        items[idx].position, items[idx - 1].position = items[idx - 1].position, items[idx].position
    elif direction == "down" and idx < len(items) - 1:
        items[idx].position, items[idx + 1].position = items[idx + 1].position, items[idx].position

    db.session.commit()

    # Re-fetch in new order and cascade dates
    items = get_ordered_planner()
    cascade_dates(items)

    return api_planner_get()


# ── Scores API ───────────────────────────────────────────────────────

@app.route("/api/scores", methods=["GET"])
def api_scores_get():
    scores = Score.query.order_by(Score.id).all()
    return jsonify([
        {"name": s.name, "date": s.date, "score": s.score, "notes": s.notes}
        for s in scores
    ])


@app.route("/api/scores", methods=["POST"])
def api_scores_post():
    body = request.json
    score = Score(
        name=body.get("name", ""),
        date=body.get("date", ""),
        score=body.get("score", 0),
        notes=body.get("notes", ""),
    )
    db.session.add(score)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/scores/delete", methods=["POST"])
def api_scores_delete():
    body = request.json
    idx = body["index"]
    scores = Score.query.order_by(Score.id).all()
    if 0 <= idx < len(scores):
        db.session.delete(scores[idx])
        db.session.commit()
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
