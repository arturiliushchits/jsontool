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

* [ ] **Strategy Pattern**:
  * [x] Створити базовий клас/інтерфейс `ExportStrategy`.
  * [x] Реалізувати `MarkdownExportStrategy` (генерація Markdown-таблиці з полів JSON Schema).
  * [x] Реалізувати `JsonExportStrategy`.
  * [ ] Покрити тестами `/tests/strategy.test.js`.

* [ ] **Template Method Pattern**:
  * [x] Створити абстрактний `BaseValidator` з кроками `parseJson`, `validateRules`, `formatErrors`.
  * [x] Реалізувати `SchemaStructureValidator` (перевірка відповідності специфікації JSON Schema).
  * [x] Реалізувати `JsonValueValidator` (перевірка JSON-значень проти схеми).
  * [ ] Покрити тестами `/tests/template_method.test.js`.

* [ ] **Flyweight Pattern (UI Type Controls)**:
  * [x] Створити клас `TypeControlFlyweight` для зберігання розділюваного стану UI-компонентів типів даних.
  * [x] Створити `TypeControlFactory` у `/public/js/ui/` з внутрішнім кешем (`Map`) для перевикористання єдиних інстансів controls.
  * [ ] Перевірити перевикористання інстансів фабрики та відсутність дублювання об'єктів у тестах `/tests/flyweight.test.js`.

## 🗄 Етап 3: Бекенд API та База Даних

* [x] Налаштувати Express сервер у `/server/main.js`.
* [x] Створити маршрути `/server/routes/schemas.js`:
  * [x] `POST /api/schemas` — збереження нової схеми/додавання в `schema_history`.
  * [x] `GET /api/schemas/:link` — завантаження схеми за хеш-посиланням.
  * [x] `GET /api/schemas/:link/history` — отримання історії змін.
  * [x] `GET /api/schemas/:link/history/:historyId` — отримання конкретної версії з історії.
* [x] Створити маршрут `/server/routes/export.js` з використанням Strategy.

## 💻 Етап 4: Фронтенд та Клієнтські Паттерни

* [ ] **Observer Pattern**:
  * [x] Реалізувати `EditorSubject` у `/public/js/observer.js`.
  * [x] Підключити `LiveValidationObserver`, `AutoSaveObserver`, `FlatViewObserver`.

* [ ] **Command Pattern**:
  * [x] Реалізувати менеджер команд з підтримкою Undo/Redo у `/public/js/commands.js`.
  * [x] Реалізувати `UpdatePropertyCommand` та `ReplaceSchemaCommand`.

* [ ] **Інтерфейс користувача (UI)**:
  * [x] Інтегрувати текстовий редактор підсвітки JSON Schema.
  * [x] Створити візуальну таблицю редагування метаданих (`description`, `example`, `type`, `format`).
  * [x] Створити панель Flat View та панель валідації JSON-даних.
  * [x] Додати кнопку створення Share-посилання та експорту у Markdown.

## 🧪 Етап 5: Контроль якості та Фіналізація

* [ ] Запустити повний комплект тестів `npm test`.
* [ ] Перевірити відповідність коду критеріям з `standards/definition-of-done.md`.
* [ ] Перевірити відсутність надлишкового або дубльованого коду.
* [ ] Заповнити `/ai/prompts-log.md` та створити звіт про сесію в `/ai/sessions/`.