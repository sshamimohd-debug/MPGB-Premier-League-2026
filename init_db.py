import sqlite3

def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    # Table for Players (Annexure-1)
    c.execute('''CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        emp_id TEXT,
        role TEXT
    )''')

    # Table for Scores
    c.execute('''CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT,
        winner TEXT
    )''')

    conn.commit()
    conn.close()
    print("MPGB Database Created Successfully!")

if __name__ == '__main__':
    init_db()