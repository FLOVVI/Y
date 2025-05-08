import sqlite3
from datetime import datetime

DB_PATH = "chat.db"

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()

# Create messages table
cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    '''
)
conn.commit()

def save_message(sender: str, recipient: str, content: str):
    ts = datetime.utcnow().isoformat()
    cursor.execute(
        'INSERT INTO messages (sender, recipient, content, timestamp) VALUES (?, ?, ?, ?)',
        (sender, recipient, content, ts)
    )
    conn.commit()

def get_history(user1: str, user2: str):
    cursor.execute(
        '''SELECT sender, recipient, content, timestamp
           FROM messages
           WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)
           ORDER BY id ASC''',
        (user1, user2, user2, user1)
    )
    return cursor.fetchall()