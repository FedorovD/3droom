# Квартира и санузел — 3D план

Интерактивный 3D-визуализатор квартиры (React, TypeScript, Vite, Three.js) с режимом прогулки от первого лица, выбором отделки пола и 3D-размерными линейками.

## Локальный запуск

```bash
npm install
npm run dev
```

Проверка типов и продакшен-сборка:

```bash
npm run lint
npm run build
```

## Деплой на GitHub и CI/CD

В репозитории настроены два workflow в `.github/workflows/`:

- `ci.yml` — проверяет типы (`npm run lint`) и сборку (`npm run build`) на каждом Pull Request и ветках разработки.
- `deploy.yml` — при пуше в ветку `main` (или вручную через `workflow_dispatch`) собирает приложение с автоматическим `VITE_BASE_PATH` под имя репозитория и публикует его на **GitHub Pages**.

### Первичная настройка в GitHub

1. Выгрузите код в репозиторий GitHub (через кнопку экспорта в GitHub в AI Studio или локально):
   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. В настройках репозитория откройте **Settings → Pages** и в разделе **Build and deployment → Source** выберите **GitHub Actions**.
3. После этого каждый пуш в `main` будет автоматически собирать и публиковать актуальную 3D-сцену по адресу `https://<username>.github.io/<repo>/`.
