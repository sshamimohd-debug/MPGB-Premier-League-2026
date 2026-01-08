from flask import Flask, render_template, request, redirect
import sqlite3

app = Flask(__name__)

# [cite_start]Groups Data (Circular Page 5 [cite: 96, 97, 98, 99])
GROUPS = {
    'A': {'venue': 'Indore', 'teams': ['Bhopal', 'Dewas', 'HO', 'Narmadapuram', 'Sehore']},
    'B': {'venue': 'Dhar', 'teams': ['Dhar', 'Jhabua', 'Khargone', 'Mandsaur', 'Ujjain']},
    'C': {'venue': 'Jabalpur', 'teams': ['Jabalpur', 'Rewa', 'Mandla', 'Sidhi']},
    'D': {'venue': 'Gwalior', 'teams': ['Gwalior', 'Satna', 'Shivpuri', 'Damoh']}
}

@app.route('/')
def index():
    return render_template('index.html', groups=GROUPS)

if __name__ == '__main__':
    app.run(debug=True)