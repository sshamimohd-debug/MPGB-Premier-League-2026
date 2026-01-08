from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# --- 1. CONFIGURATION & DATA ---
# [cite_start]Revised Schedule (Source: Circular Page 1, Date 03.01.2026) [cite: 180]
TOURNAMENT_INFO = {
    "dates": "24th & 25th January 2026",
    "note": "Matches rescheduled due to preparation time."
}

# [cite_start]Groups Data (Source: Circular Page 5) [cite: 101]
GROUPS = {
    'A': {'venue': 'Indore', 'teams': ['Head Office', 'Sehore', 'Dewas', 'Bhopal', 'Narmadapuram']},
    'B': {'venue': 'Dhar', 'teams': ['Dhar', 'Jhabua', 'Khargone', 'Mandsaur', 'Ujjain']},
    'C': {'venue': 'Jabalpur', 'teams': ['Jabalpur', 'Rewa', 'Mandla', 'Sidhi', 'Shahdol', 'Chhindwara']},
    'D': {'venue': 'Gwalior', 'teams': ['Gwalior', 'Satna', 'Shivpuri', 'Damoh', 'Chhatarpur', 'Tikamgarh']}
}

# [cite_start]Revised Fixtures (Source: Revised Schedule Table) [cite: 184]
SCHEDULE = [
    {"time": "09:00 AM", "match": "Sehore vs Dewas (Gp A) / Ujjain vs Mandsaur (Gp B)"},
    {"time": "10:15 AM", "match": "Narmadapuram vs HO (Gp A) / Khargone vs Dhar (Gp B)"},
    {"time": "11:30 AM", "match": "Dewas vs Bhopal (Gp A) / Jhabua vs Ujjain (Gp B)"},
    {"time": "12:45 PM", "match": "HO vs Sehore (Gp A) / Mandsaur vs Khargone (Gp B)"},
    {"time": "02:00 PM", "match": "Bhopal vs Narmadapuram (Gp A) / Dhar vs Jhabua (Gp B)"}
]

# Temporary Data Storage (RAM)
data_store = {
    'match': {'score': 0, 'wickets': 0, 'overs': 0.0, 'bowler_stats': {}},
    'finance': [], # Budget Tracker
    'players': []  # Registrations
}

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html', groups=GROUPS, info=TOURNAMENT_INFO, schedule=SCHEDULE)

# --- FEATURE: SCORING ENGINE ---
@app.route('/match')
def match_screen():
    return render_template('match.html', match=data_store['match'])

@app.route('/update_score', methods=['POST'])
def update_score():
    action = request.form.get('action')
    bowler = request.form.get('bowler_name', 'Unknown')
    
    # [cite_start]RULE: Max 2 Overs per Bowler [cite: 114]
    overs_bowled = data_store['match']['bowler_stats'].get(bowler, 0)
    
    if action == 'new_over':
        if overs_bowled >= 2:
            return "ERROR: Bowler Limit Exceeded (Max 2 Overs Allowed)"
        data_store['match']['bowler_stats'][bowler] = overs_bowled + 1
        data_store['match']['overs'] = round(data_store['match']['overs'] + 1, 1)

    # Scoring Actions
    if action == 'run':
        data_store['match']['score'] += int(request.form.get('runs'))
    elif action == 'wicket':
        data_store['match']['wickets'] += 1
    elif action == 'extra':
        data_store['match']['score'] += 1 # Wide/No-Ball
    
    return redirect(url_for('match_screen'))

# --- FEATURE: REGISTRATION (Annexure-1) ---
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        player = {
            'name': request.form.get('name'),
            'role': request.form.get('role'),
            [cite_start]'disease': request.form.get('disease') # Mandatory [cite: 63]
        }
        data_store['players'].append(player)
        return redirect(url_for('index'))
    return render_template('register.html')

# --- FEATURE: FINANCE MANAGER ---
@app.route('/finance', methods=['GET', 'POST'])
def finance():
    if request.method == 'POST':
        item = {'desc': request.form.get('desc'), 'amount': int(request.form.get('amount')), 'type': request.form.get('type')}
        data_store['finance'].append(item)
    
    total = sum(i['amount'] if i['type']=='Income' else -i['amount'] for i in data_store['finance'])
    return render_template('finance.html', records=data_store['finance'], total=total)

if __name__ == '__main__':
    app.run(debug=True)
