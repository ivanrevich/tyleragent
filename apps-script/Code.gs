// ─── Приём предзаказов Аси: Google Таблица + уведомление в Telegram ───
//
// Бесплатно, без сервера: скрипт живёт внутри вашей Google Таблицы.
// Установка — landing/apps-script/README.md.
//
// Секреты не в коде: Проект → Настройки → Свойства скрипта
//   TG_TOKEN   — токен бота от @BotFather (бот шлёт вам уведомления)
//   TG_CHAT_ID — ваш chat id (узнать: написать боту @userinfobot)

const SHEET = "Предзаказы";

// порядок колонок в таблице = ключи заявки из app.js
const COLUMNS = [
  "created_at", "segment", "name", "contact", "industry", "company", "team", "volume",
  "tasks", "channels", "current", "plan", "when", "comment",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "click_id", "referrer",
  "page", "user_agent",
];

const TITLES = {
  created_at: "Когда", segment: "Кто", name: "Имя", contact: "Контакт", industry: "Сфера",
  company: "Компания", team: "Сотрудников", volume: "Обращений/день", tasks: "Задачи", channels: "Каналы", current: "Пользуется сейчас",
  plan: "Тариф", when: "Когда начать", comment: "Комментарий",
  utm_source: "utm_source", utm_medium: "utm_medium", utm_campaign: "utm_campaign",
  utm_content: "utm_content", utm_term: "utm_term", click_id: "click id", referrer: "Откуда",
  page: "Страница", user_agent: "Браузер",
};

function doPost(e) {
  try {
    const lead = JSON.parse(e.postData.contents);
    validate(lead);
    appendRow(lead);
    notify(lead);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

// открыть адрес скрипта в браузере — проверка, что он развёрнут
function doGet() {
  return json({ ok: true, service: "asya-preorders" });
}

function validate(lead) {
  if (!lead || typeof lead !== "object") throw new Error("пустая заявка");
  if (!lead.name || !lead.contact) throw new Error("нет имени или контакта");
  // от спама: обрезаем каждое поле
  COLUMNS.forEach((k) => { if (lead[k] != null) lead[k] = String(lead[k]).slice(0, 2000); });
}

function appendRow(lead) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map((k) => TITLES[k] || k));
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
    }
    // «'» впереди — чтобы Таблица не превратила телефон и +7… в формулу/число
    sheet.appendRow(COLUMNS.map((k) => {
      const v = lead[k] == null ? "" : String(lead[k]);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    }));
  } finally {
    lock.releaseLock();
  }
}

function notify(lead) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TG_TOKEN");
  const chat = props.getProperty("TG_CHAT_ID");
  if (!token || !chat) return;

  const who = { personal: "для себя", "self-employed": "ИП/самозанятый", company: "компания" }[lead.segment] || lead.segment;
  const lines = [
    "🟢 Новый предзаказ",
    `${lead.name} — ${lead.contact}`,
    `Кто: ${who}${lead.company ? " · " + lead.company : ""}${lead.industry ? " · " + lead.industry : ""}`,
    lead.tasks && `Задачи: ${lead.tasks}`,
    lead.channels && `Каналы: ${lead.channels}`,
    lead.current && `Сейчас: ${lead.current}`,
    lead.plan && `Тариф: ${lead.plan}`,
    lead.when && `Начать: ${lead.when}`,
    lead.comment && `💬 ${lead.comment}`,
    (lead.utm_source || lead.utm_campaign) && `Реклама: ${lead.utm_source} / ${lead.utm_campaign} / ${lead.utm_content}`,
  ].filter(Boolean);

  // уведомление — не критично: заявка уже в таблице, ошибку Telegram не показываем человеку
  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chat, text: lines.join("\n"), disable_web_page_preview: true }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error(err);
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
