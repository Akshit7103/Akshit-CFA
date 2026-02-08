from flask import Flask, render_template, jsonify, request
import json
import os
from datetime import datetime

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(__file__), "progress_data.json")

# ── All CFA Level I study data ──────────────────────────────────────────
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

WEEKLY_PLAN = [
    {"wk": 1, "week_of": "09 Feb 2026", "topic": "Ethics & Professional Standards", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 2, "week_of": "16 Feb 2026", "topic": "Ethics & Professional Standards", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 3, "week_of": "23 Feb 2026", "topic": "Ethics & Professional Standards", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 4, "week_of": "02 Mar 2026", "topic": "Quantitative Methods", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 5, "week_of": "09 Mar 2026", "topic": "Quantitative Methods", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 6, "week_of": "16 Mar 2026", "topic": "Quantitative Methods", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 7, "week_of": "23 Mar 2026", "topic": "Economics", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 8, "week_of": "30 Mar 2026", "topic": "Economics", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 9, "week_of": "06 Apr 2026", "topic": "Economics", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 10, "week_of": "13 Apr 2026", "topic": "Financial Statement Analysis", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 11, "week_of": "20 Apr 2026", "topic": "Financial Statement Analysis", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 12, "week_of": "27 Apr 2026", "topic": "Financial Statement Analysis", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 13, "week_of": "04 May 2026", "topic": "Corporate Issuers", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 14, "week_of": "11 May 2026", "topic": "Corporate Issuers", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 15, "week_of": "18 May 2026", "topic": "Corporate Issuers", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 16, "week_of": "25 May 2026", "topic": "Equity Investments", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 17, "week_of": "01 Jun 2026", "topic": "Equity Investments", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 18, "week_of": "08 Jun 2026", "topic": "Equity Investments", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 19, "week_of": "15 Jun 2026", "topic": "Fixed Income", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 20, "week_of": "22 Jun 2026", "topic": "Fixed Income", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 21, "week_of": "29 Jun 2026", "topic": "Fixed Income", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 22, "week_of": "06 Jul 2026", "topic": "Derivatives", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 23, "week_of": "13 Jul 2026", "topic": "Derivatives", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 24, "week_of": "20 Jul 2026", "topic": "Derivatives", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 25, "week_of": "27 Jul 2026", "topic": "Alternative Investments", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
    {"wk": 26, "week_of": "03 Aug 2026", "topic": "Alternative Investments", "videos": "3 videos", "reading": "1 reading", "questions": "20 Qs", "hours": 21},
]


def default_data():
    """Generate fresh default progress data."""
    # Build reading index: topic_idx -> reading_idx -> {videos, kaplan, cfai}
    checklists = {}
    for ti, topic in enumerate(TOPICS):
        for ri in range(len(topic["readings"])):
            key = f"{ti}_{ri}"
            checklists[key] = {"videos": False, "kaplan": False, "cfai": False}

    return {
        "checklists": checklists,
        "weekly": {str(w["wk"]): {"hours_actual": 0, "notes": ""} for w in WEEKLY_PLAN},
        "scores": [],
    }


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    data = default_data()
    save_data(data)
    return data


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Routes ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/topics")
def api_topics():
    return jsonify(TOPICS)


@app.route("/api/weekly")
def api_weekly():
    return jsonify(WEEKLY_PLAN)


@app.route("/api/progress")
def api_progress():
    data = load_data()
    return jsonify(data)


@app.route("/api/toggle", methods=["POST"])
def api_toggle():
    body = request.json
    key = body["key"]        # e.g. "2_5"
    category = body["cat"]   # "videos" | "kaplan" | "cfai"
    data = load_data()
    if key not in data["checklists"]:
        data["checklists"][key] = {"videos": False, "kaplan": False, "cfai": False}
    data["checklists"][key][category] = not data["checklists"][key][category]
    save_data(data)
    return jsonify({"ok": True, "value": data["checklists"][key][category]})


@app.route("/api/weekly/update", methods=["POST"])
def api_weekly_update():
    body = request.json
    wk = str(body["wk"])
    data = load_data()
    if wk not in data["weekly"]:
        data["weekly"][wk] = {"hours_actual": 0, "notes": ""}
    if "hours_actual" in body:
        data["weekly"][wk]["hours_actual"] = body["hours_actual"]
    if "notes" in body:
        data["weekly"][wk]["notes"] = body["notes"]
    save_data(data)
    return jsonify({"ok": True})


@app.route("/api/scores", methods=["GET"])
def api_scores_get():
    data = load_data()
    return jsonify(data.get("scores", []))


@app.route("/api/scores", methods=["POST"])
def api_scores_post():
    body = request.json
    data = load_data()
    data["scores"].append({
        "name": body.get("name", ""),
        "date": body.get("date", ""),
        "score": body.get("score", 0),
        "notes": body.get("notes", ""),
    })
    save_data(data)
    return jsonify({"ok": True})


@app.route("/api/scores/delete", methods=["POST"])
def api_scores_delete():
    body = request.json
    idx = body["index"]
    data = load_data()
    if 0 <= idx < len(data["scores"]):
        data["scores"].pop(idx)
    save_data(data)
    return jsonify({"ok": True})


@app.route("/api/reset", methods=["POST"])
def api_reset():
    data = default_data()
    save_data(data)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
