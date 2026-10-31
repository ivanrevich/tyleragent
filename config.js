// ─── Настройки лендинга: правится только этот файл ───
window.MARKER_CONFIG = {
  // Адрес веб-приложения Google Apps Script (см. landing/apps-script/README.md).
  // Пусто — заявки сохраняются только в браузере (для проверки вёрстки).
  formEndpoint: "https://script.google.com/macros/s/AKfycbw1GKQaTNMdc8kF_JjJXsXLokIKyLL3DN5GxQAldF9t7Rq7CFDbtHgW2RxALgXHgAG2IQ/exec",

  // Номер счётчика Яндекс Метрики (metrika.yandex.ru). Пусто — без аналитики.
  metrikaId: "",

  // Куда писать тем, кто не хочет заполнять форму
  telegram: "https://t.me/your_username",
  email: "hello@example.ru",
};
