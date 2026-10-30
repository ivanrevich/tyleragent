// ─── Лендинг TylerAgent: переключатели, цены, форма предзаказа ───
(() => {
  "use strict";

  const cfg = window.MARKER_CONFIG || {};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // localStorage бывает недоступен (приватный режим) — не роняем страницу
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ничего */ } },
  };

  // ─── Метки рекламы: первое касание запоминаем, чтобы знать, какая реклама сработала ───

  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "vkclid"];
  const params = new URLSearchParams(location.search);
  const current = Object.fromEntries(UTM_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  if (Object.keys(current).length && !store.get("tyler_first_touch")) {
    store.set("tyler_first_touch", { ...current, referrer: document.referrer, at: new Date().toISOString() });
  }
  const attribution = () => ({
    ...current,
    first_touch: store.get("tyler_first_touch") || { referrer: document.referrer },
  });

  // ─── Яндекс Метрика (если указан счётчик) ───

  if (cfg.metrikaId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(cfg.metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  const goal = (name, data) => { if (cfg.metrikaId && window.ym) window.ym(cfg.metrikaId, "reachGoal", name, data); };
  $$("[data-goal]").forEach((el) => el.addEventListener("click", () => goal(el.dataset.goal)));

  // ─── Контакты ───

  const tg = $("#tg-link"), mail = $("#mail-link");
  if (tg && cfg.telegram) tg.href = cfg.telegram;
  if (mail && cfg.email) mail.href = "mailto:" + cfg.email;

  // ─── Обратный отсчёт до запуска ───

  const countdown = $(".countdown");
  if (countdown) {
    const launch = new Date(countdown.dataset.launch).getTime();
    const tick = () => {
      const left = launch - Date.now();
      if (left <= 0) { countdown.textContent = ""; return; }
      const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60;
      countdown.textContent = `до старта ${d} д ${h} ч ${String(m).padStart(2, "0")} мин`;
    };
    tick();
    setInterval(tick, 30_000);
  }

  // ─── Роли для бизнеса: фильтр по отделам ───

  $$("[data-dept].filter").forEach((btn) => btn.addEventListener("click", () => {
    $$(".filter").forEach((b) => b.classList.toggle("is-on", b === btn));
    $$(".agent").forEach((a) => { a.hidden = btn.dataset.dept !== "all" && a.dataset.dept !== btn.dataset.dept; });
  }));

  // ─── Месяц / год: цены пересчитываются из data-month ───

  const rub = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";
  const renderPrices = (period) => {
    $$(".price[data-month]").forEach((el) => {
      const month = Number(el.dataset.month);
      if (!month) { el.innerHTML = "0 ₽"; return; }
      el.innerHTML = period === "year"
        ? `${rub(Math.round(month * 0.8))} <small>/ мес при оплате за год</small>`
        : `${rub(month)} <small>/ мес</small>`;
    });
  };
  $$("[data-period]").forEach((btn) => btn.addEventListener("click", () => {
    $$("[data-period]").forEach((b) => b.classList.toggle("is-on", b === btn));
    renderPrices(btn.dataset.period);
  }));
  renderPrices("month");

  // ─── Форма предзаказа ───

  const form = $("#preorder-form");
  const thanks = $("#thanks");
  const errorBox = $(".form__error", form);

  // кнопка тарифа подставляет его в форму
  $$("[data-plan]").forEach((a) => a.addEventListener("click", () => {
    form.plan.value = a.dataset.plan;
    const business = ["business", "team", "enterprise"].includes(a.dataset.plan);
    const seg = business ? "company" : (a.dataset.plan === "free" || a.dataset.plan === "personal" ? "personal" : null);
    if (seg) { form.querySelector(`[name=segment][value=${seg}]`).checked = true; syncSegment(); }
    goal("plan_click", { plan: a.dataset.plan });
  }));

  // «Для себя» — вопросы про помощника, иначе — про компанию
  const syncSegment = () => {
    const personal = form.segment.value === "personal";
    $$("[data-business]", form).forEach((el) => { el.hidden = personal; });
    $$("[data-personal]", form).forEach((el) => { el.hidden = !personal; });
  };
  $$("[name=segment]", form).forEach((r) => r.addEventListener("change", syncSegment));
  syncSegment();

  // телефон, @ник или почта
  const CONTACT = /^(@[\w\d_]{4,32}|(\+?\d[\d\s()-]{9,17})|[^\s@]+@[^\s@]+\.[^\s@]+|t\.me\/[\w\d_]{4,32}|https?:\/\/t\.me\/[\w\d_]{4,32})$/i;

  const showError = (text) => { errorBox.textContent = text; errorBox.hidden = !text; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    $$(".is-bad", form).forEach((el) => el.classList.remove("is-bad"));

    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    if (!name) { form.name.classList.add("is-bad"); form.name.focus(); return showError("Как к вам обращаться?"); }
    if (!CONTACT.test(contact)) { form.contact.classList.add("is-bad"); form.contact.focus(); return showError("Укажите Telegram (@ник), телефон или почту — чтобы мы могли ответить."); }
    if (!form.consent.checked) return showError("Нужно согласие на обработку данных.");
    if (form.website.value) return; // бот заполнил скрытое поле

    const personal = form.segment.value === "personal";
    const lead = {
      created_at: new Date().toISOString(),
      segment: form.segment.value,
      name,
      contact,
      industry: personal ? "" : form.industry.value,
      company: personal ? "" : form.company.value.trim(),
      team: personal ? "" : form.team.value,
      volume: personal ? "" : form.volume.value,
      // только видимые галочки: при смене «для себя / компания» скрытые не считаем
      tasks: checked("tasks"),
      channels: personal ? "" : checked("channels"),
      current: personal ? checked("current") : "",
      plan: form.plan.value,
      when: form.when.value,
      comment: form.comment.value.trim(),
      page: location.href.split("#")[0],
      ...flatAttribution(attribution()),
      user_agent: navigator.userAgent,
    };

    const button = $("button[type=submit]", form);
    button.disabled = true;
    button.textContent = "Отправляем…";
    try {
      await send(lead);
      // копия у человека в браузере — пригодится, если он вернётся
      store.set("tyler_lead", { name, at: lead.created_at });
      goal("preorder", { plan: lead.plan, segment: lead.segment });
      $("#thanks-name").textContent = name;
      form.hidden = true;
      thanks.hidden = false;
      thanks.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error(err);
      showError("Не получилось отправить. Попробуйте ещё раз или напишите нам в Telegram.");
    } finally {
      button.disabled = false;
      button.textContent = "Оставить предзаказ";
    }
  });

  function checked(name) {
    return $$(`[name=${name}]:checked`, form).filter((c) => !c.closest("[hidden]")).map((c) => c.value).join(", ");
  }

  function flatAttribution(a) {
    const ft = a.first_touch || {};
    return {
      utm_source: a.utm_source || ft.utm_source || "",
      utm_medium: a.utm_medium || ft.utm_medium || "",
      utm_campaign: a.utm_campaign || ft.utm_campaign || "",
      utm_content: a.utm_content || ft.utm_content || "",
      utm_term: a.utm_term || ft.utm_term || "",
      click_id: a.yclid || a.vkclid || ft.yclid || ft.vkclid || "",
      referrer: ft.referrer || document.referrer || "",
    };
  }

  async function send(lead) {
    if (!cfg.formEndpoint) {
      // адрес не настроен: сохраняем локально, чтобы можно было проверить вёрстку
      const all = store.get("tyler_leads_local") || [];
      all.push(lead);
      store.set("tyler_leads_local", all);
      console.warn("[TylerAgent] formEndpoint не задан в config.js — заявка сохранена только в этом браузере:", lead);
      return;
    }
    // text/plain — «простой» запрос без preflight: Apps Script не умеет отвечать на OPTIONS
    const resp = await fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(lead),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.ok === false) throw new Error(data.error || "HTTP " + resp.status);
  }

  // ─── Плавающая кнопка на телефоне прячется, когда форма на экране ───

  const sticky = $(".sticky-cta");
  if (sticky && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => sticky.classList.toggle("is-hidden", entry.isIntersecting), { threshold: 0.1 })
      .observe($("#preorder"));
  }
})();
