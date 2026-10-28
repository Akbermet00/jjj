# Умный гардероб

Сайт, где вещи фотографируются и сохраняются в базу данных. Из них собираются образы, а по запросу ищутся модные тренды и магазины, где можно купить похожее.

- **Фронтенд:** HTML, CSS и JS без сборки (`public/`)
- **Бэкенд:** Node.js + Express
- **База данных:** SQLite (файл `data/wardrobe.db`, создаётся сам)
- **Фото:** хранятся в `uploads/`; на телефоне кнопка открывает камеру
- **Тренды и магазины:** SerpAPI (Google). Без ключа работает запасной режим

## Запуск

```bash
npm install
cp .env.example .env     # по желанию вставьте SERPAPI_KEY
npm start
```

Откройте http://localhost:3000. Нужен Node.js 18 или новее.

Через Docker:

```bash
docker build -t wardrobe .
docker run -p 3000:3000 -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads wardrobe
```

## API

| Метод | Адрес | Что делает |
|-------|-------|------------|
| GET | `/api/health` | проверка работы |
| GET | `/api/items?category=&q=` | список вещей |
| GET | `/api/items/:id` | одна вещь |
| POST | `/api/items` | добавить (multipart: `photo`, `name`, `category`, `season`, `color`, `brand`, `notes`) |
| PUT | `/api/items/:id` | изменить данные (JSON) |
| DELETE | `/api/items/:id` | удалить вещь и фото |
| GET | `/api/outfits?season=` | собрать образы из гардероба |
| GET | `/api/trends?q=` | поиск трендов |
| GET | `/api/shop?q=` | поиск, где купить |

Категории: `top`, `bottom`, `dress`, `outerwear`, `shoes`, `accessory`.
Сезоны: `all`, `spring`, `summer`, `autumn`, `winter`.

## Тренды и «где купить»

В `.env` задайте `SERPAPI_KEY`. Тогда `/api/trends` ищет статьи о трендах в Google, а `/api/shop` отдаёт товары из Google Покупок с ценой и ссылкой. Язык и страна задаются через `SEARCH_HL` и `SEARCH_GL`. Ответы кэшируются на час.

Без ключа тренды берутся из встроенного списка, а вместо товаров даются ссылки на поиск в Google Покупках, Wildberries, Lamoda, Ozon и AliExpress.

## Что стоит добавить дальше

- Вход по логину: сейчас гардероб один на всех, кто открыл сайт
- Автоопределение цвета и категории по фото
- Хранение фото в облаке (S3) вместо папки `uploads/`
