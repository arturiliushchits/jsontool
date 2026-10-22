# Чеклист розробки (Checklist) — JSON Tool

Кроки розробки проєкту від початкового налаштування до фінальної здачі.

## 📑 Етап 1: Ініціалізація та Структура

* [x] Створити структуру каталогів проєкту згідно із вимогами:
  * [x] `/ai/sessions/`
  * [x] `/ai/prompts-log.md`
  * [x] `/public/` (`index.html`, `style.css`, `js/`)
  * [x] `/server/` (`core/`, `db/`, `routes/`, `main.js`)
  * [x] `/standards/` (`adr/`, `checklist.md`, `definition-of-done.md`, `spec.md`)
  * [x] `/tests/`
  * [x] `Makefile`, `package.json`, `README.md`
* [x] Налаштувати `package.json` з необхідними скриптами.
* [x] Налаштувати SQLite базу даних та написати скрипт таблиць `schemas` та `schema_history`.

## 🧩 Етап 2: Реалізація Ядра (Core Pattern Implementation)

* [x] **Strategy Pattern**:
  * [x] Створити базовий клас/інтерфейс `ExportStrategy`.
  * [x] Реалізувати `MarkdownExportStrategy` (генерація Markdown-таблиці з полів JSON Schema).
  * [x] Реалізувати `JsonExportStrategy`.
  * [x] Покрити модульними тестами стратегії експорту.

* [x] **Template Method Pattern**:
  * [x] Створити абстрактний `BaseValidator` з кроками `parseJson`, `validateRules`, `formatErrors`.
  * [x] Реалізувати `SchemaStructureValidator` (перевірка відповідності специфікації JSON Schema).
  * [x] Реалізувати `JsonValueValidator` (перевірка JSON-значень проти схеми).
  * [x] Покрити модульними тестами валідатори.

* [x] **Flyweight Pattern (UI Type Controls)**:
  * [x] Створити клас `TypeControlFlyweight` для зберігання розділюваного стану UI-компонентів типів даних.
  * [x] Створити `TypeControlFactory` у `/public/js/ui/` з внутрішнім кешем (`Map`) для перевикористання єдиних інстансів controls.
  * [x] Перевірити повторне використання фабрикою екземплярів одного типу.

## 🗄 Етап 3: Бекенд API та База Даних

* [x] Налаштувати Express сервер у `/server/main.js`.
* [x] Створити маршрути `/server/routes/schemas.js`:
  * [x] `POST /api/schemas` — збереження нової схеми/додавання в `schema_history`.
  * [x] `GET /api/schemas/:link` — завантаження схеми за хеш-посиланням.
  * [x] `GET /api/schemas/:link/history` — отримання історії змін.
  * [x] `GET /api/schemas/:link/history/:historyId` — отримання конкретної версії з історії.
* [x] Створити маршрут `/server/routes/export.js` з використанням Strategy.

## 💻 Етап 4: Фронтенд та Клієнтські Паттерни

* [x] **Observer Pattern**:
  * [x] Реалізувати `EditorSubject` у `/public/js/observer.js`.
  * [x] Підключити `LiveValidationObserver` і `FlatViewObserver`; збереження запускається лише кнопкою.

* [x] **Command Pattern**:
  * [x] Реалізувати менеджер команд з підтримкою Undo/Redo у `/public/js/commands.js`.
  * [x] Реалізувати `UpdatePropertyCommand` та `ReplaceSchemaCommand`.

* [x] **Інтерфейс користувача (UI)**:
  * [x] Інтегрувати текстовий редактор підсвітки JSON Schema.
  * [x] Створити візуальну таблицю редагування метаданих (`description`, `example`, `type`, `format`).
  * [x] Створити панель Flat View та панель валідації JSON-даних.
  * [x] Додати кнопку створення Share-посилання та експорту у Markdown.
  * [x] Додати явне збереження remote snapshot і перейменування елементів історії.
  * [x] Додати підтвердження та видалення snapshot із remote history.

## 🧪 Етап 5: Контроль якості та Фіналізація

* [x] Додати unit-, integration- та Playwright end-to-end тести; `npm test` запускає всі три набори.
* [x] Додати окремий запуск StrykerJS.
* [x] Запустити повний комплект тестів `npm test`.
* [ ] Перевірити відповідність коду критеріям з `standards/definition-of-done.md`.
* [ ] Перевірити відсутність надлишкового або дубльованого коду.
* [ ] Заповнити `/ai/prompts-log.md` та створити звіт про сесію в `/ai/sessions/`.