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
* [ ] Налаштувати SQLite базу даних та написати скрипт таблиць `schemas` та `schema_history`.

## 🧩 Етап 2: Реалізація Ядра (Core Pattern Implementation)

* [ ] **Strategy Pattern**:
  * [ ] Створити базовий клас/інтерфейс `ExportStrategy`.
  * [ ] Реалізувати `MarkdownExportStrategy` (генерація Markdown-таблиці з полів JSON Schema).
  * [ ] Реалізувати `JsonExportStrategy`.
  * [ ] Покрити тестами `/tests/strategy.test.js`.

* [ ] **Template Method Pattern**:
  * [ ] Створити абстрактний `BaseValidator` з кроками `parseJson`, `validateRules`, `formatErrors`.
  * [ ] Реалізувати `SchemaValidator` (перевірка відповідності специфікації JSON Schema).
  * [ ] Реалізувати `JsonValueValidator` (перевірка JSON-значень проти схеми).
  * [ ] Покрити тестами `/tests/template_method.test.js`.

* [ ] **Flyweight Pattern (UI Type Controls)**:
  * [ ] Створити клас `TypeControlFlyweight` для зберігання розділюваного стану UI-компонентів типів даних (`string`, `number`, `boolean`, `array`, `object`).
  * [ ] Створити `TypeControlFactory` у `/public/js/ui/` з внутрішнім кешем (`Map`) для перевикористання єдиних інстансів controls.
  * [ ] Перевірити перевикористання інстансів фабрики та відсутність дублювання об'єктів у тестах `/tests/flyweight.test.js`.

## 🗄 Етап 3: Бекенд API та База Даних

* [ ] Налаштувати Express сервер у `/server/main.js`.
* [ ] Створити маршрути `/server/routes/schemas.js`:
  * [ ] `POST /api/schemas` — збереження нової схеми/додавання в `schema_history`.
  * [ ] `GET /api/schemas/:link` — завантаження схеми за хеш-посиланням.
  * [ ] `GET /api/schemas/:link/history` — отримання історії змін.
  * [ ] `GET /api/schemas/:link/history/:historyId` — отримання конкретної версії з історії.
* [ ] Створити маршрут `/server/routes/export.js` з використанням Strategy.

## 💻 Етап 4: Фронтенд та Клієнтські Паттерни

* [ ] **Observer Pattern**:
  * [ ] Реалізувати `EditorSubject` у `/public/js/observer.js`.
  * [ ] Підключити `LiveValidationHandler`, `AutoSaveHandler`, `FlatViewHandler`.

* [ ] **Command Pattern**:
  * [ ] Реалізувати менеджер команд з підтримкою Undo/Redo у `/public/js/commands.js`.
  * [ ] Реалізувати `UpdatePropertyCommand` та `ReplaceSchemaCommand`.

* [ ] **Інтерфейс користувача (UI)**:
  * [ ] Інтегрувати текстовий редактор підсвітки JSON Schema.
  * [ ] Створити візуальну таблицю редагування метаданих (`description`, `example`, `type`, `format`).
  * [ ] Створити панель Flat View та панель валідації JSON-даних.
  * [ ] Додати кнопку створення Share-посилання та експорту у Markdown.

## 🧪 Етап 5: Контроль якості та Фіналізація

* [ ] Запустити повний комплект тестів `npm test`.
* [ ] Перевірити відповідність коду критеріям з `standards/definition-of-done.md`.
* [ ] Перевірити відсутність надлишкового або дубльованого коду.
* [ ] Заповнити `/ai/prompts-log.md` та створити звіт про сесію в `/ai/sessions/`.