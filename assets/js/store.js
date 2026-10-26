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
    beige: ["бежевий", "#f0efec"],
    purple: ["бузковий", "#c5aacd"],
    brown: ["коричневий", "#877665"],
    grey: ["сірий", "#d9e1e7"],
    turquoise: ["бірюзовий", "#b8dadf"],
    pattern: ["картатий візерунок", null],
  };

  // Візерунок доступний як варіант товару, але не входить до фільтра кольорів
  const filterColors = Object.keys(colors).filter((key) => key !== "pattern");
  // Дані товарів: код, назва, ціна, категорія, фото, опис фото, кольори, бренд, теги, розміри та колекція
  const rows = [
    [
      "red-hat",
      "Червоний капелюх",
      800,
      "Капелюхи",
      "shop-red-hat",
      "Червоний жіночий капелюх",
      ["yellow", "black"],
      "Minimog",
      ["Мода", "Капелюхи"],
      ["S", "M"],
      "Аксесуари",
    ],
    [
      "linen-shirt",
      "Лляна сорочка",
      1700,
      "Сорочки",
      "shop-black-shirt",
      "Чорна жіноча сорочка",
      ["sky", "pink"],
      "Retrolie Brook",
      ["Мода"],
      ["S", "M", "L"],
      "Новинки",
    ],
    [
      "long-jacket",
      "Жакет із довгими рукавами",
      10600,
      "Верхній одяг",
      "shop-long-coat",
      "Жіночий чорний жакет",
      ["beige", "green"],
      "Learts",
      ["Мода"],
      ["M", "L", "XL"],
      "Бестселери",
    ],
    [
      "blue-hat",
      "Синій капелюх",
      2500,
      "Капелюхи",
      "shop-denim-hat",
      "Темно-синій капелюх",
      ["sky", "blue"],
      "Vagabond",
      ["Капелюхи", "Денім", "Vagabond"],
      ["S", "M"],
      "Аксесуари",
    ],
    [
      "black-top",
      "Чорний топ",
      2500,
      "Топи",
      "shop-black-top",
      "Чорний жіночий топ",
      ["green", "pattern"],
      "Abby",
      ["Мода"],
      ["S", "M", "L"],
      "Новинки",
    ],
    [
      "red-jacket",
      "Червона вітровка",
      3900,
      "Верхній одяг",
      "shop-red-jacket",
      "Червона вітровка",
      ["red", "purple", "white"],
      "Minimog",
      ["Мода", "Minimog"],
      ["M", "L", "XL", "XXL"],
      "Бестселери",
    ],
    [
      "sunglasses",
      "Поляризаційні окуляри",
      1800,
      "Окуляри",
      "shop-sunglasses",
      "Сонцезахисні окуляри",
      ["black", "brown"],
      "Learts",
      ["Окуляри", "Пляжний одяг"],
      ["M"],
      "Аксесуари",
    ],
    [
      "rockstar-jacket",
      "Куртка Rockstar",
      2200,
      "Верхній одяг",
      "shop-black-jacket",
      "Чорна жіноча куртка",
      ["purple", "sky"],
      "Retrolie Brook",
      ["Мода"],
      ["S", "M", "L", "XL"],
      "Новинки",
    ],
    [
      "dot-dress",
      "Чорна сукня в горошок",
      2000,
      "Сукні",
      "shop-dot-dress",
      "Чорна сукня в горошок",
      ["blue", "black", "grey"],
      "Abby",
      ["Мода"],
      ["S", "M", "L"],
      "Бестселери",
    ],
  ];

  // Перетворюємо рядки даних на об’єкти товарів із потрібними властивостями
  const products = rows.map((r, i) => ({
    id: r[0],
    name: r[1],
    price: r[2],
    category: r[3],
    image: `assets/images/shop/${r[4]}.webp`,
    alt: r[5],
    colors: r[6],
    brand: r[7],
    tags: r[8],
    sizes: r[9],
    collection: r[10],
    soldOut: i === 1,
    oldPrice: i === 5 ? 5900 : i === 6 ? 2100 : null,
    rank: i,
  }));

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

  // Відбирає товари за пошуком і фільтрами, а потім сортує результат
  function query(source, filters = {}) {
    const q = (filters.q || "").trim().toLocaleLowerCase("uk");
    const found = source.filter(
      (p) =>
        (!q ||
          `${p.name} ${p.category} ${p.brand}`
            .toLocaleLowerCase("uk")
            .includes(q)) &&
        (!filters.size || p.sizes.includes(filters.size)) &&
        (!filters.color || p.colors.includes(filters.color)) &&
        (!filters.brand || p.brand === filters.brand) &&
        (!filters.collection || p.collection === filters.collection) &&
        (!filters.tag || p.tags.includes(filters.tag)) &&
        (!filters.price ||
          (p.price >= filters.price[0] && p.price < filters.price[1])),
    );
    return found.sort((a, b) =>
      filters.sort === "price-asc"
        ? a.price - b.price
        : filters.sort === "price-desc"
          ? b.price - a.price
          : filters.sort === "name"
            ? a.name.localeCompare(b.name, "uk")
            : a.rank - b.rank,
    );
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
    filterColors,
    KEY,
    product,
    quantity,
    lineKey,
    cleanCart,
    read,
    save,
    add,
    totals,
    query,
    validate,
  };
});
