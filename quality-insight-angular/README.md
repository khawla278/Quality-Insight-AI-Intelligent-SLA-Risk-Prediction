# Quality Insight Angular

## Démarrage

```powershell
npm install
npm start
```

Frontend: http://localhost:4200
Backend FastAPI attendu: http://127.0.0.1:8000

Le Dashboard appelle `POST /predict/explain`, enregistre la prédiction et ses influences dans `localStorage`, puis Analytics et Explainability lisent cet historique.
