import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect('database.db', timeout=30.0)
conn.row_factory = sqlite3.Row

# 1. Comptes de test documentés dans README
conn.execute('''
    INSERT OR IGNORE INTO users (matricule, password, nom, prenom, email, poste, direction, role, statut_contrat, date_embauche)
    VALUES ('MAT001', 'pass123', 'KOUASSI', 'Yves', 'y.kouassi@sgci.ci', 'Conseiller Clientèle', 'Réseau Agences', 'user', 'CDI', '2025-03-01')
''')
conn.execute('''
    INSERT OR IGNORE INTO users (matricule, password, nom, prenom, email, poste, direction, role, statut_contrat, date_embauche)
    VALUES ('MAT002', 'pass123', 'AKE', 'Marc', 'm.ake@sgci.ci', 'Analyste Crédit', 'Direction Engagements', 'user', 'CDI', '2025-06-15')
''')

# 2. Formations bancaires SGCI
conn.execute('''
    INSERT OR IGNORE INTO courses (id, title, desc, domain, duration, level, visibility)
    VALUES (101, 'Conformité Bancaire & LCB-FT', 'Maîtrise des directives prudentielles et lutte anti-blanchiment SGCI', 'Conformité', 2.0, 'Débutant', 'assigned')
''')
conn.execute('''
    INSERT OR IGNORE INTO courses (id, title, desc, domain, duration, level, visibility)
    VALUES (102, 'Gestion des Risques Opérationnels', 'Dispositif de maîtrise et de surveillance des risques bancaires', 'Risques', 3.0, 'Intermédiaire', 'assigned')
''')
conn.execute('''
    INSERT OR IGNORE INTO courses (id, title, desc, domain, duration, level, visibility)
    VALUES (103, 'Secret Professionnel & Éthique SGCI', 'Protection des données clients et déontologie bancaire', 'Éthique', 1.5, 'Débutant', 'public')
''')

u1 = conn.execute("SELECT id FROM users WHERE matricule='MAT001'").fetchone()['id']
u2 = conn.execute("SELECT id FROM users WHERE matricule='MAT002'").fetchone()['id']

now = datetime.now()
d_plus_7 = (now + timedelta(days=7)).strftime('%Y-%m-%d 23:59:59')
d_minus_3 = (now - timedelta(days=3)).strftime('%Y-%m-%d 23:59:59')

# 3. Assignations
conn.execute('''
    INSERT OR REPLACE INTO course_assignments (user_id, course_id, assigned_by, status, due_date, is_overdue, qcm_score, oral_score, final_score, passed, completed_at)
    VALUES (?, 101, 1, 'passed', ?, 0, 85.0, 80.0, 83.5, 1, ?)
''', (u1, d_plus_7, now.strftime('%Y-%m-%d %H:%M:%S')))

conn.execute('''
    INSERT OR REPLACE INTO course_assignments (user_id, course_id, assigned_by, status, due_date, is_overdue, qcm_score)
    VALUES (?, 102, 1, 'in_progress', ?, 0, 70.0)
''', (u1, d_plus_7))

conn.execute('''
    INSERT OR REPLACE INTO course_assignments (user_id, course_id, assigned_by, status, due_date, is_overdue)
    VALUES (?, 101, 1, 'assigned', ?, 0)
''', (u2, d_plus_7))

# 4. Progression & Évaluations
conn.execute('''
    INSERT OR REPLACE INTO user_course_progress (user_id, course_id, current_slide, total_slides, progress_percent, completed_training)
    VALUES (?, 101, 10, 10, 100, 1)
''', (u1,))
conn.execute('''
    INSERT OR REPLACE INTO user_course_progress (user_id, course_id, current_slide, total_slides, progress_percent, completed_training)
    VALUES (?, 102, 4, 10, 40, 0)
''', (u1,))

conn.execute('''
    INSERT OR REPLACE INTO course_evaluations (user_id, course_id, score, passed, correct_answers, total_questions)
    VALUES (?, 101, 85.0, 1, 13, 15)
''', (u1,))

conn.execute('''
    INSERT OR REPLACE INTO oral_evaluations (course_id, user_id, transcript, score_oral, feedback)
    VALUES (101, ?, 'Argumentation claire et respect du secret bancaire SGCI.', 80.0, 'Validation complète.')
''', (u1,))

# 5. Téléchargements
conn.execute('''
    INSERT OR IGNORE INTO document_downloads (user_id, course_id, module_id, doc_type, filename)
    VALUES (?, 101, 1, 'PDF', 'SGCI_TCHIA_SUPPORT_COURS_CONFORMITE_M1_V1.pdf')
''', (u1,))
conn.execute('''
    INSERT OR IGNORE INTO document_downloads (user_id, course_id, module_id, doc_type, filename)
    VALUES (?, 102, 1, 'PPTX', 'SGCI_TCHIA_PRESENTATION_RISQUES_M1_V1.pptx')
''', (u1,))

conn.commit()
conn.close()
print("Données de démonstration et de pilotage initialisées avec succès.")
