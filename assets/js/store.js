// Дані товарів і функції кошика. Ціни зберігаються в центах для точного підрахунку
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FascoStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const colors = {
    red: ["червоний", "#df2738"],
    black: ["чорний", "#000"],
    pink: ["рожевий", "#f8ccdb"],
    blue: ["синій", "#06456e"],
    sky: ["блакитний", "#8fbad5"],
    green: ["зелений", "#bedfc1"],
    yellow: ["жовтий", "#ffd32a"],
    white: ["білий", "#f5f5f5"],
    beige: ["світло-сірий", "#f0efec"],
    purple: ["бузковий", "#c5aacd"],
    brown: ["коричневий", "#877665"],
    grey: ["сірий", "#d9e1e7"],
    turquoise: ["бірюзовий", "#b8dadf"],
    pattern: ["картатий візерунок", null],
  };

  const colorNames = Object.keys(colors).filter((key) => key !== "pattern");
  const products = [];

  async function loadProducts() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("assets/data/products.json", {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Не вдалося завантажити товари.");
      const data = await response.json();
      if (
        !Array.isArray(data) ||
        new Set(data.map((p) => p?.id)).size !== data.length ||
        data.some(
          (p) =>
            !p ||
            typeof p.id !== "string" ||
            !p.id ||
            typeof p.name !== "string" ||
            !p.name.trim() ||
            !Number.isInteger(p.price) ||
            p.price < 0 ||
            typeof p.image !== "string" ||
            !p.image ||
            typeof p.alt !== "string" ||
            !Array.isArray(p.sizes) ||
            !p.sizes.length ||
            p.sizes.some((size) => typeof size !== "string" || !size) ||
            !Array.isArray(p.colors) ||
            !p.colors.length ||
            p.colors.some((color) => !Object.hasOwn(colors, color)) ||
            typeof p.soldOut !== "boolean" ||
            (p.oldPrice != null &&
              (!Number.isInteger(p.oldPrice) || p.oldPrice < 0)),
        )
      )
        throw new Error("Некоректні дані товарів.");
      products.splice(0, products.length, ...data);
      return products;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Назва запису, під якою кошик зберігається у localStorage
  const KEY = "fasco.cart.v1";
  // Знаходить товар за його кодом
  const product = (id) => products.find((p) => p.id === id);
  // Залишає цілу кількість у межах від 1 до 99
  const quantity = (value) =>
    Math.min(99, Math.max(1, Math.trunc(Number(value)) || 1));
  // Відрізняємо позиції кошика за товаром, розміром і кольором
  const lineKey = (l) => JSON.stringify([l.id, l.size, l.color]);
  // Перевіряє збережений кошик, відкидає некоректні позиції та об’єднує однакові
  function cleanCart(value) {
    const cart = { version: 1, items: [], giftWrap: false };
    if (!value || value.version !== 1 || !Array.isArray(value.items))
      return cart;
    for (const line of value.items.slice(0, 200)) {
      if (!line || typeof line !== "object") continue;
      const p = product(line.id);
      const color = line.color === "plaid" ? "pattern" : line.color;
      if (
        !p ||
        p.soldOut ||
        !p.sizes.includes(line.size) ||
        !p.colors.includes(color) ||
        !Number.isInteger(line.qty) ||
        line.qty < 1 ||
        line.qty > 99
      )
        continue;
      const canonical = { id: p.id, size: line.size, color, qty: line.qty };
      const existing = cart.items.find(
        (l) => lineKey(l) === lineKey(canonical),
      );
      if (existing) existing.qty = quantity(existing.qty + line.qty);
      else cart.items.push(canonical);
    }
    cart.giftWrap = value.giftWrap === true && cart.items.length > 0;
    return cart;
  }

  // Завантажує кошик зі сховища або повертає порожній кошик
  function read(storage) {
    try {
      return cleanCart(JSON.parse(storage.getItem(KEY)));
    } catch {
      return cleanCart(null);
    }
  }

  // Зберігає кошик і повідомляє, чи вдалося виконати запис
  function save(storage, cart) {
    const safe = cleanCart(cart);
    try {
      storage.setItem(KEY, JSON.stringify(safe));
      return true;
    } catch {
      return false;
    }
  }

  // Додає товар або збільшує кількість уже вибраного варіанта
  function add(cart, id, size, color, qty) {
    const p = product(id);
    if (!p || p.soldOut || !p.sizes.includes(size) || !p.colors.includes(color))
      return cleanCart(cart);
    const next = cleanCart(cart),
      line = { id, size, color, qty: quantity(qty) };
    const old = next.items.find((l) => lineKey(l) === lineKey(line));
    if (old) old.qty = quantity(old.qty + line.qty);
    else next.items.push(line);
    return next;
  }

  // Рахує вартість товарів, пакування, загальну суму та кількість одиниць
  function totals(cart) {
    const safe = cleanCart(cart);
    const subtotal = safe.items.reduce(
      (s, l) => s + product(l.id).price * l.qty,
      0,
    );
    const packaging = safe.giftWrap ? 1000 : 0;
    return {
      subtotal,
      packaging,
      total: subtotal + packaging,
      count: safe.items.reduce((s, l) => s + l.qty, 0),
    };
  }

  // Перевіряє поля форми та повертає повідомлення про знайдені помилки
  function validate(fields) {
    const errors = {};
    if (
      "name" in fields &&
      (fields.name.trim().length < 2 || fields.name.trim().length > 80)
    )
      errors.name = "Вкажіть ім’я: від 2 до 80 символів, не лише пробіли.";
    if (
      "email" in fields &&
      (fields.email.trim().length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    )
      errors.email = "Вкажіть коректний email, наприклад name@example.com.";
    if (
      "phone" in fields &&
      (fields.phone.trim().length > 30 ||
        !/^(?:\+?38)?0\d{9}$/.test(fields.phone.replace(/[\s()-]/g, "")))
    )
      errors.phone = "Вкажіть номер телефону у форматі 0XXXXXXXXX або +380XXXXXXXXX.";
    if (
      "message" in fields &&
      (fields.message.trim().length < 10 || fields.message.trim().length > 1500)
    )
      errors.message =
        "Повідомлення має містити від 10 до 1500 символів, не лише пробіли.";
    if (
      "address" in fields &&
      (fields.address.trim().length < 10 || fields.address.trim().length > 200)
    )
      errors.address = "Адреса має містити від 10 до 200 символів.";
    return errors;
  }
  return {
    products,
    colors,
    colorNames,
    loadProducts,
    KEY,
    product,
    quantity,
    lineKey,
    cleanCart,
    read,
    save,
    add,
    totals,
    validate,
  };
});
