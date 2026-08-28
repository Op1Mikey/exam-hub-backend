# Exam Hub — Backend

API REST pour la gestion d'examens QCM.  
Stack : Node.js + Express + TypeScript + PostgreSQL.

---

## Prérequis

- Node.js >= 18
- PostgreSQL >= 14 (local ou Docker)
- npm

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd exam-hub-backend
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
```

Edite `.env` et renseigne :

```env
PORT=3000
DATABASE_URL=postgresql://postgres:TON_MOT_DE_PASSE@localhost:5432/examhub
JWT_SECRET=change_moi_en_production
JWT_EXPIRES_IN=8h
ADMIN_EMAIL=admin@examhub.local
ADMIN_PASSWORD=Admin123!
```

---

## Base de données

### Avec PostgreSQL local

1. Créer la base :

```sql
CREATE DATABASE examhub;
```

2. Appliquer le schéma (depuis psql) :

```sql
\i 'chemin/vers/db/schema.sql'
```

3. Insérer les données initiales :

```sql
-- Compte admin (mot de passe : password)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES ('Administrateur', 'admin@examhub.local', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrKiyWi', 'admin', true);

-- Compte étudiant de test (mot de passe : password)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES ('Etudiant Test', 'student@examhub.local', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrKiyWi', 'student', true);
```

### Avec Docker

```bash
docker-compose up -d
```

---

## Lancer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

---

## Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@examhub.local | password |
| Étudiant | student@examhub.local | password |

---

## Routes principales

### Auth
| Méthode | Route | Accès |
|---|---|---|
| POST | /api/auth/login | Public |

### Admin
| Méthode | Route |
|---|---|
| GET/POST | /api/students |
| PUT/DELETE | /api/students/:id |
| GET/POST | /api/courses |
| PUT/DELETE | /api/courses/:id |
| GET/POST | /api/exams |
| GET/PUT/DELETE | /api/exams/:id |
| GET/POST | /api/exams/:id/questions |
| PUT/DELETE | /api/questions/:id |
| GET | /api/exams/:id/results |

### Étudiant
| Méthode | Route |
|---|---|
| GET | /api/my/exams |
| GET | /api/my/exams/:id |
| POST | /api/my/exams/:id/submit |
| GET | /api/my/results |

---

## Architecture

```
src/
├── config/         # Connexion PostgreSQL
├── controllers/    # Gestion des requêtes HTTP
├── middleware/     # Auth JWT + gestion erreurs
├── repositories/   # Requêtes SQL paramétrées
├── routes/         # Définition des routes
└── services/       # Règles métier
```

---

## Règles de gestion importantes

- **RG-02** : Un étudiant ne peut passer un examen qu'une seule fois
- **RG-03** : Vérification fenêtre de disponibilité côté serveur
- **RG-06** : Score calculé uniquement côté serveur
- **RG-07** : `is_correct` jamais exposé à l'étudiant
- **RG-10** : Désactivation étudiant (jamais suppression physique)