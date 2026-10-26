// Інтерактивні компоненти сторінок: меню, форми, каталог, слайдери та кошик
(() => {
  "use strict";
  const S = window.FascoStore;
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (v) => `$${(v / 100).toFixed(2)}`;
  // Допоміжні функції для створення елементів, кнопок і посилань
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, cls, action) {
    const n = el("button", cls, text);
    n.type = "button";
    if (action) n.addEventListener("click", action);
    return n;
  }
  function link(text, href) {
    const n = el("a", "", text);
    n.href = href;
    return n;
  }

  // Підготовка сторінки з відкритим мінікошиком
  const preview = document.body.classList.contains("minicart-demo");
  if (preview) {
    document.body.classList.remove("minicart-demo");
    $$("[inert]").forEach((n) => n.removeAttribute("inert"));
    $(".mini-preview-backdrop")?.remove();
    const panel = $("#minicart-panel");
    panel.setAttribute("popover", "auto");
    const original = $(".mini-close", panel),
      close = button("", "mini-close");
    close.innerHTML = original.innerHTML;
    close.setAttribute("aria-label", "Закрити мінікошик");
    close.setAttribute("popovertarget", "minicart-panel");
    close.setAttribute("popovertargetaction", "hide");
    original.replaceWith(close);
    $$('button[aria-label="Кошик"],.add-to-cart').forEach((b) =>
      b.setAttribute("popovertarget", "minicart-panel"),
    );
  }

  const live = el("p", "fasco-announcement");
  live.setAttribute("role", "status");
  document.body.append(live);
  let announcementTimer;
  const announce = (text) => {
    clearTimeout(announcementTimer);
    live.textContent = text;
    announcementTimer = setTimeout(() => {
      live.textContent = "";
    }, 3000);
  };
  // Якщо зображення не завантажилося, показуємо запасне
  const fallback = (img) =>
    img.addEventListener(
      "error",
      () => {
        img.src = "assets/images/favicon.png";
        img.classList.add("image-fallback");
      },
      { once: true },
    );
  $$("img").forEach(fallback);
  let storage;
  try {
    storage = localStorage;
  } catch {
    storage = null;
  }
  let cart = S.read(storage);

  // Зберігає зміни кошика та оновлює його на сторінці
  function commit(next) {
    cart = S.cleanCart(next);
    const saved = S.save(storage, cart);
    if (!saved)
      announce(
        "Сховище недоступне. Кошик збережено лише до закриття сторінки.",
      );
    renderCart();
    return saved;
  }
  // Оновлюємо кошик, якщо його змінили в іншій вкладці браузера
  window.addEventListener("storage", (e) => {
    if (e.key === S.KEY || e.key === null) {
      cart = S.read(storage);
      renderCart();
    }
  });

  // Відкриває модальне вікно. Його можна закрити хрестиком, кліком поза ним або Escape
  function openDialog(title, content, opener = document.activeElement) {
    const dialog = el("dialog", "fasco-dialog"),
      head = el("div", "fasco-dialog-head"),
      heading = el("h2", "", title);
    heading.id = "fasco-dialog-title";
    dialog.setAttribute("aria-labelledby", heading.id);
    const close = button("×", "fasco-dialog-close", () => dialog.close());
    close.setAttribute("aria-label", "Закрити вікно");
    head.append(heading, close);
    dialog.append(head, content);
    document.body.append(dialog);
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    });
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        if (opener?.isConnected) opener.focus();
      },
      { once: true },
    );
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const nodes = $$("button,input,textarea,select,a[href]", dialog).filter(
        (n) => !n.disabled && !n.hidden,
      );
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    dialog.showModal();
    ($("input,textarea", dialog) || close).focus();
    return dialog;
  }
  const info = (title, text) => openDialog(title, el("p", "", text));

  // Створює форму запитання або оформлення та перевіряє введені дані
  function validatedForm(kind) {
    const form = el("form", "fasco-form");
    form.noValidate = true;
    const fields =
      kind === "question"
        ? [
            ["name", "Ім’я", "text", 80],
            ["email", "Email", "email", 254],
            ["message", "Повідомлення про товар", "textarea", 1500],
          ]
        : [
            ["name", "Ім’я", "text", 80],
            ["email", "Email", "email", 254],
            ["address", "Адреса доставки", "text", 200],
          ];
    fields.forEach(([name, label, type, max]) => {
      const row = el("div"),
        id = `fasco-${name}`,
        lab = el("label", "", label);
      lab.htmlFor = id;
      const input = el(type === "textarea" ? "textarea" : "input");
      if (type !== "textarea") input.type = type;
      input.id = id;
      input.name = name;
      input.required = true;
      input.maxLength = max;
      input.minLength = name === "name" ? 2 : name === "email" ? 1 : 10;
      if (name !== "message")
        input.autocomplete = name === "address" ? "street-address" : name;
      const error = el("p", "field-error");
      error.id = `${id}-error`;
      input.setAttribute("aria-describedby", error.id);
      input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        error.textContent = "";
      });
      row.append(lab, input, error);
      form.append(row);
    });
    if (kind === "checkout")
      form.append(
        el(
          "p",
          "demo-note",
          "Демонстраційне оформлення без платежів. Замовлення не передається на сервер.",
        ),
      );
    const status = el("p", "form-status");
    status.setAttribute("role", "status");
    const submit = button(
      kind === "question" ? "Підтвердити запит" : "Перевірити замовлення",
      "fasco-primary",
    );
    submit.type = "submit";
    form.append(submit, status);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errors = S.validate(Object.fromEntries(new FormData(form)));
      fields.forEach(([name]) => {
        form.elements
          .namedItem(name)
          .setAttribute("aria-invalid", String(!!errors[name]));
        $(`#fasco-${name}-error`, form).textContent = errors[name] || "";
      });
      const first = Object.keys(errors)[0];
      if (first) {
        status.textContent =
          "Перевірте позначені поля. Введені дані збережено у формі.";
        form.elements.namedItem(first).focus();
        return;
      }
      if (kind === "checkout" && !cart.items.length) {
        status.textContent = "Кошик порожній. Додайте товар перед оформленням.";
        return;
      }
      status.textContent =
        kind === "question"
          ? "Дані перевірено локально. Це демонстрація: повідомлення не надіслано."
          : `Дані перевірено. Сума ${money(S.totals(cart).total)}. Це демонстрація: замовлення не створено, платіж не здійснювався.`;
    });
    return form;
  }

  // Відкриття і закриття мобільного меню
  const toggle = $(".nav-toggle,.menu-toggle-input"),
    nav = $(".main-nav,.nav-menu");
  let menu = toggle
    ? $(`label[for="${toggle.id}"]`)
    : $(".main-header .menu-btn");
  if (menu && nav) {
    if (menu.tagName === "LABEL") {
      const b = button("");
      b.className = menu.className;
      b.innerHTML = menu.innerHTML;
      b.setAttribute(
        "aria-label",
        menu.getAttribute("aria-label") || "Відкрити або закрити меню",
      );
      menu.replaceWith(b);
      menu = b;
      toggle.tabIndex = -1;
      toggle.setAttribute("aria-hidden", "true");
    }
    nav.id ||= "fasco-navigation";
    menu.setAttribute("aria-controls", nav.id);

    function setMenu(open) {
      if (toggle) toggle.checked = open;
      nav.classList.toggle("is-active", open);
      menu.classList.toggle("is-active", open);
      menu.setAttribute("aria-expanded", String(open));
    }
    setMenu(false);
    menu.addEventListener("click", () =>
      setMenu(menu.getAttribute("aria-expanded") !== "true"),
    );
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menu.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !menu.contains(e.target)) setMenu(false);
    });
  }

  // Пошук, фільтри та сортування товарів у каталозі
  const grid = $("#product-grid");
  if (grid) {
    const originalCards = $$(".product-card", grid),
      defaultCard = originalCards[0].cloneNode(true);
    const templates = new Map(
      S.products
        .slice(0, originalCards.length)
        .map((p, i) => [p.id, originalCards[i].cloneNode(true)]),
    );
    const filters = {
        q: new URLSearchParams(location.search).get("q") || "",
        sort: "default",
      },
      search = $("#product-search");
    search.value = filters.q;
    const select = el("select", "fasco-sort");
    select.setAttribute("aria-label", "Сортувати товари");
    [
      ["default", "Найкращі продажі"],
      ["price-asc", "Ціна: за зростанням"],
      ["price-desc", "Ціна: за спаданням"],
      ["name", "За назвою"],
    ].forEach(([v, t]) => {
      const o = el("option", "", t);
      o.value = v;
      select.append(o);
    });
    $(".sorting-dropdown").replaceChildren(select);
    const summary = el("p", "catalog-result");
    summary.setAttribute("role", "status");
    $(".catalog-toolbar").after(summary);
    let page = 1;
    const pageSize = 9,
      pagination = $(".catalog-pagination");
    const reset = button("Скинути фільтри", "filter-reset", () => {
      Object.keys(filters).forEach((k) => delete filters[k]);
      filters.q = "";
      filters.sort = "default";
      search.value = "";
      select.value = "default";
      page = 1;
      $$(".filters-sidebar [aria-pressed]").forEach((b) =>
        b.setAttribute("aria-pressed", "false"),
      );
      render();
    });
    $(".filters-sidebar").append(reset);
    // Створює кнопку фільтра та застосовує або скидає вибрану умову
    function filterButton(node, key, value) {
      const b = button(node.textContent, node.className);
      if (node.classList.contains("color-dot")) b.textContent = "";
      b.setAttribute(
        "aria-label",
        key === "color" ? `Колір: ${S.colors[value][0]}` : node.textContent,
      );
      b.setAttribute("aria-pressed", "false");
      b.dataset.filter = key;
      b.addEventListener("click", () => {
        const active = b.getAttribute("aria-pressed") !== "true";
        $$(`[data-filter="${key}"]`).forEach((n) =>
          n.setAttribute("aria-pressed", "false"),
        );
        b.setAttribute("aria-pressed", String(active));
        filters[key] = active ? value : null;
        page = 1;
        render();
      });
      node.replaceWith(b);
      return b;
    }
    $$(".filters-sidebar .size-btn").forEach((n) =>
      filterButton(n, "size", n.textContent.trim()),
    );
    const colorBox = $(".filters-sidebar .color-options");
    colorBox.replaceChildren();
    S.filterColors.forEach((value) => {
      const [label, hex] = S.colors[value];
      const n = el("span", "color-dot", label);
      colorBox.append(n);
      const b = filterButton(n, "color", value);
      b.style.backgroundColor = hex;
      b.title = label;
    });
    $$(".price-list a,.price-list button").forEach((n) =>
      filterButton(
        n,
        "price",
        n.textContent.match(/\d+/g).map((v) => Number(v) * 100),
      ),
    );
    $$(".brand-list a,.brand-list button").forEach((n) =>
      filterButton(n, "brand", n.textContent.trim()),
    );
    $$(".collection-list a,.collection-list button").forEach((n, i) =>
      filterButton(n, "collection", i === 0 ? null : n.textContent.trim()),
    );
    $$(".tags-list a,.tags-list button").forEach((n) => {
      const v = n.textContent.trim();
      if (S.products.some((p) => p.tags.includes(v))) filterButton(n, "tag", v);
      else n.closest("li").remove();
    });
    // Виводить картки, кількість результатів і кнопки сторінок
    function render() {
      const found = S.query(S.products, filters),
        pages = Math.max(1, Math.ceil(found.length / pageSize));
      page = Math.min(page, pages);
      summary.textContent = `Знайдено товарів: ${found.length}. Сторінка ${page} з ${pages}.`;
      grid.replaceChildren();
      found.slice((page - 1) * pageSize, page * pageSize).forEach((p) => {
        const card = (templates.get(p.id) || defaultCard).cloneNode(true);
        card.dataset.productId = p.id;
        const url = new URL("product-page.html", location.href);
        url.searchParams.set("id", p.id);
        if (filters.color && p.colors.includes(filters.color))
          url.searchParams.set("color", filters.color);
        if (filters.size && p.sizes.includes(filters.size))
          url.searchParams.set("size", filters.size);
        const productUrl = url.href;
        const image = $(".product-image-wrap img", card);
        image.src = p.image;
        image.alt = p.alt;
        fallback(image);
        const imageWrap = $(".product-image-wrap", card),
          oldLink = $("a", imageWrap);
        if (oldLink) {
          oldLink.href = productUrl;
          oldLink.setAttribute("aria-label", `Переглянути: ${p.name}`);
        } else {
          const a = link("", productUrl);
          image.replaceWith(a);
          a.append(image);
        }
        $(".product-title", card).replaceChildren(link(p.name, productUrl));
        const price = $(".product-price", card);
        price.replaceChildren(document.createTextNode(money(p.price)));
        if (p.oldPrice)
          price.append(
            document.createTextNode(" "),
            el("del", "", money(p.oldPrice)),
          );
        const badge = $(".sold-out-badge", card);
        if (badge && !p.soldOut) badge.remove();
        if (p.soldOut && !badge)
          imageWrap.append(el("span", "sold-out-badge", "РОЗПРОДАНО"));
        const samples = $(".product-colors", card);
        const originalSamples = $$(".color-dot", samples);
        samples.replaceChildren();
        p.colors.forEach((value, i) => {
          const dot =
            originalSamples[i]?.cloneNode(false) || el("span", "color-dot");
          dot.classList.toggle(
            "is-selected",
            value === (filters.color || p.colors[0]),
          );
          dot.dataset.color = value;
          dot.style.backgroundColor = S.colors[value][1] || "transparent";
          if (value === "pattern") {
            const sampleImage = el("img");
            sampleImage.src = "assets/images/shop/shop-plaid-cloth.webp";
            sampleImage.alt = "";
            dot.append(sampleImage);
          }
          dot.setAttribute("role", "img");
          dot.setAttribute("aria-label", `Зразок: ${S.colors[value][0]}`);
          dot.title = S.colors[value][0];
          samples.append(dot);
        });
        grid.append(card);
      });
      if (!found.length) {
        const empty = el(
          "div",
          "catalog-empty",
          "Товарів за цими умовами не знайдено. Спробуйте іншу назву або скиньте фільтри.",
        );
        empty.append(
          button("Скинути фільтри", "filter-reset", () => reset.click()),
        );
        grid.append(empty);
      }
      pagination.replaceChildren();
      for (let i = 1; i <= pages; i++) {
        const b = button(
          String(i),
          "page-number" + (i === page ? " active" : ""),
          () => {
            page = i;
            render();
          },
        );
        b.setAttribute("aria-label", `Сторінка ${i}`);
        if (i === page) b.setAttribute("aria-current", "page");
        pagination.append(b);
      }
      pagination.hidden = pages === 1;
    }
    search.addEventListener("input", () => {
      filters.q = search.value;
      page = 1;
      render();
    });
    select.addEventListener("change", () => {
      filters.sort = select.value;
      page = 1;
      render();
    });
    render();
  } else {
    const search = $("#product-search");
    search?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && search.value.trim()) {
        e.preventDefault();
        location.href = `shop-page.html?q=${encodeURIComponent(search.value.trim())}`;
      }
    });
  }

  // Створює поле кількості з кнопками плюс і мінус
  function quantityControl(value, change, cls = "quantity-control") {
    const wrap = el("div", cls),
      row = el(
        "div",
        cls === "mini-quantity" ? "mini-qty-state" : "quantity-state",
      );
    const minus = button("−", "", () => change(value - 1)),
      plus = button("+", "", () => change(value + 1));
    minus.setAttribute("aria-label", "Зменшити кількість");
    plus.setAttribute("aria-label", "Збільшити кількість");
    minus.disabled = value <= 1;
    plus.disabled = value >= 99;
    const input = el(
      "input",
      cls === "mini-quantity" ? "mini-value" : "quantity-value",
    );
    input.type = "number";
    input.value = value;
    input.min = 1;
    input.max = 99;
    input.step = 1;
    input.setAttribute("aria-label", "Кількість товару");
    let last = value;
    input.addEventListener("change", () => {
      const next = S.quantity(input.value);
      input.value = next;
      if (next !== last) {
        last = next;
        change(next);
      }
    });
    row.append(minus, input, plus);
    wrap.append(row);
    return wrap;
  }
  const options = $(".product-options");
  // Визначаємо товар за адресою сторінки та заповнюємо його дані
  const productParams = new URLSearchParams(location.search);
  const current = S.product(productParams.get("id") || "red-jacket");
  if (options && !current) {
    location.replace("404.html");
    return;
  }
  if (options) {
    let qty = 1,
      control = $(".quantity-control", options);
    function setQuantity(v) {
      qty = S.quantity(v);
      const label = document.activeElement?.getAttribute("aria-label"),
        next = quantityControl(qty, setQuantity);
      control.replaceWith(next);
      control = next;
      if (label) $(`[aria-label="${label}"]`, control)?.focus();
    }
    setQuantity(1);
    if (current.id !== "red-jacket") {
      $("#product-title").textContent = current.name;
      document.title = `${current.name} — FASCO`;
      $('meta[name="description"]').content =
        `${current.name}: ціна, кольори, розміри та демонстраційний кошик FASCO.`;
      const photo = $(".product-photo img");
      photo.src = current.image;
      photo.alt = current.alt;
      $(".product-price").replaceChildren(el("span", "", money(current.price)));
      if (current.oldPrice)
        $(".product-price").append(el("del", "", money(current.oldPrice)));
      const thumbnails = $(".product-thumbnails");
      const thumbnail = thumbnails.firstElementChild.cloneNode(true);
      thumbnail.classList.add("selected");
      thumbnail.setAttribute("aria-current", "true");
      const thumbnailImage = $("img", thumbnail);
      thumbnailImage.src = current.image;
      thumbnailImage.alt = current.alt;
      thumbnails.replaceChildren(thumbnail);
      $$(
        ".sale-timer,.stock-status,.viewing,.delivery-info,.product-rating",
        $(".product-details"),
      ).forEach((n) => (n.hidden = true));
    }
    ["size", "color"].forEach((kind) => {
      const picker = $(`.${kind}-picker`);
      const legend = $("legend", picker);
      const requested = productParams.get(kind);
      const values = current[kind === "size" ? "sizes" : "colors"];
      const selected = values.includes(requested) ? requested : values[0];
      const updateLegend = (value) => {
        legend.textContent =
          kind === "size"
            ? `Розмір: ${value}`
            : `${current.colors.includes("pattern") ? "Варіант" : "Колір"}: ${S.colors[value][0]}`;
      };
      updateLegend(selected);
      const box = $(`.${kind}-options`, picker);
      box.replaceChildren();
      current[kind === "size" ? "sizes" : "colors"].forEach((v, i) => {
        const input = el("input", "visually-hidden");
        input.type = "radio";
        input.name = kind;
        input.value = v;
        input.id = `${kind}-${v}`;
        input.checked = v === selected;
        input.addEventListener("change", () => updateLegend(v));
        const label = el(
          "label",
          kind === "color" ? "swatch" : "",
          kind === "color" ? "" : v,
        );
        label.htmlFor = input.id;
        if (kind === "color") {
          label.style.backgroundColor = S.colors[v][1] || "transparent";
          if (v === "pattern") label.classList.add("swatch-pattern");
          label.append(el("span", "visually-hidden", S.colors[v][0]));
        }
        box.append(input, label);
      });
    });
    const add = $(".add-to-cart");
    add.disabled = current.soldOut;
    if (current.soldOut) {
      add.textContent = "Розпродано";
      const availability = el(
        "p",
        "product-unavailable",
        "На жаль, товару немає в наявності.",
      );
      availability.setAttribute("role", "status");
      $(".product-price").after(availability);
      $$(".quantity-control button,.quantity-control input", options).forEach(
        (control) => (control.disabled = true),
      );
    }
    options.addEventListener("submit", (e) => e.preventDefault());
    add.addEventListener("click", () => {
      const data = new FormData(options),
        saved = commit(
          S.add(cart, current.id, data.get("size"), data.get("color"), qty),
        );
      announce(
        `${current.name} додано до кошика.${saved ? "" : " Сховище недоступне: кошик збережено лише до закриття сторінки."}`,
      );
    });
    const tools = $$(".product-tools button");
    tools
      .find((b) => b.textContent.includes("Запитати"))
      ?.addEventListener("click", () => {
        const form = validatedForm("question");
        form.elements.message.value = `Мене цікавить товар «${current.name}». `;
        openDialog("Запитати про товар", form);
      });
    tools
      .find((b) => b.textContent.includes("Порівняти"))
      ?.addEventListener("click", () => {
        location.href = "404.html";
      });
    tools
      .find((b) => b.textContent.includes("Поділитися"))
      ?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          announce("Посилання скопійовано");
        } catch {
          info("Посилання на товар", location.href);
        }
      });
    // Натискання мініатюри змінює головне фото
    $$(".product-thumbnails li").forEach((li) => {
      const img = $("img", li),
        b = button("", "gallery-thumb");
      b.setAttribute("aria-label", `Показати фото колекції: ${img.alt}`);
      b.setAttribute("aria-pressed", String(li.classList.contains("selected")));
      img.replaceWith(b);
      b.append(img);
      b.addEventListener("click", () => {
        $$(".product-thumbnails li").forEach((n) => {
          n.classList.remove("selected");
          n.removeAttribute("aria-current");
          $("button", n).setAttribute("aria-pressed", "false");
        });
        li.classList.add("selected");
        li.setAttribute("aria-current", "true");
        b.setAttribute("aria-pressed", "true");
        const photo = $(".product-photo img");
        photo.src = img.src;
        photo.alt = img.alt;
      });
    });
  }

  const mini = $("#minicart-panel"),
    miniTemplate = mini ? $(".mini-product", mini).cloneNode(true) : null;
  if (mini) $(".mini-product", mini).replaceWith(el("div", "mini-items"));
  const cartBody = $(".cart-table tbody"),
    cartTemplate = cartBody?.firstElementChild.cloneNode(true);
  $(".cart-remove-toggle")?.remove();
  $(".cart-empty .cart-remove")?.remove();
  // Змінює кількість товару в кошику
  function updateLine(index, qty) {
    const active = document.activeElement,
      miniFocus = !!active?.closest(".mini-product"),
      label = active?.getAttribute("aria-label");
    const next = S.cleanCart(cart);
    next.items[index].qty = S.quantity(qty);
    commit(next);
    if (label) {
      const root = $$(miniFocus ? ".mini-product" : ".cart-table tbody tr")[
        index
      ];
      if (root) $(`[aria-label="${label}"]`, root)?.focus();
    }
  }
  // Прибирає вибрану позицію з кошика
  function removeLine(index) {
    const miniFocus = !!document.activeElement?.closest(".mini-product");
    const next = S.cleanCart(cart);
    next.items.splice(index, 1);
    commit(next);
    announce("Товар прибрано з кошика.");
    const rows = $$(miniFocus ? ".mini-product" : ".cart-table tbody tr");
    if (rows.length)
      $(".fasco-remove", rows[Math.min(index, rows.length - 1)])?.focus();
    else $(miniFocus ? ".mini-items a" : ".cart-empty a")?.focus();
  }
  // Оновлює товари, лічильники та суми в кошику і мінікошику
  function renderCart() {
    const t = S.totals(cart);
    $$(".cart-count").forEach((n) => {
      n.textContent = t.count;
      n.parentElement.setAttribute("aria-label", `Кошик: ${t.count} товарів`);
    });
    if (mini) {
      const box = $(".mini-items", mini);
      box.replaceChildren();
      cart.items.forEach((line, index) => {
        const p = S.product(line.id),
          item = miniTemplate.cloneNode(true),
          photo = $("img", item);
        photo.src = p.image;
        photo.alt = p.alt;
        fallback(photo);
        $$("a", item).forEach((a) => (a.href = `product-page.html?id=${p.id}`));
        $("h3 a", item).textContent = p.name;
        $(".mini-color", item).textContent =
          `Колір: ${S.colors[line.color][0]}; розмір: ${line.size}`;
        $(".mini-unit-price", item).textContent = money(p.price);
        $(".mini-quantity", item).replaceWith(
          quantityControl(
            line.qty,
            (v) => updateLine(index, v),
            "mini-quantity",
          ),
        );
        $(".mini-product-info", item).append(
          button("Прибрати", "fasco-remove", () => removeLine(index)),
        );
        box.append(item);
      });
      if (!cart.items.length)
        box.append(
          el("p", "mini-empty", "Ваш кошик порожній."),
          link("До магазину", "shop-page.html"),
        );
      $(".mini-subtotal span:last-child", mini).textContent = money(t.total);
      $(".mini-shipping", mini).textContent =
        t.subtotal >= 15000
          ? "Безкоштовна доставка доступна."
          : `До безкоштовної доставки ще ${money(15000 - t.subtotal)}.`;
      const wrap = $("#mini-gift-wrap");
      wrap.checked = cart.giftWrap;
      wrap.disabled = !cart.items.length;
    }
    if (cartBody) {
      cartBody.replaceChildren();
      cart.items.forEach((line, index) => {
        const p = S.product(line.id),
          row = cartTemplate.cloneNode(true),
          photo = $("img", row);
        photo.src = p.image;
        photo.alt = p.alt;
        fallback(photo);
        $$("a", row).forEach((a) => (a.href = `product-page.html?id=${p.id}`));
        $("h2 a", row).textContent = p.name;
        $(".cart-product-details p", row).textContent =
          `Колір: ${S.colors[line.color][0]}; розмір: ${line.size}`;
        $(".cart-remove", row).replaceWith(
          button("Прибрати", "cart-remove fasco-remove", () =>
            removeLine(index),
          ),
        );
        $(".cart-unit-price span:last-child", row).textContent = money(p.price);
        $(".quantity-control", row).replaceWith(
          quantityControl(line.qty, (v) => updateLine(index, v)),
        );
        $(".cart-line-total span:last-child", row).textContent = money(
          p.price * line.qty,
        );
        cartBody.append(row);
      });
      $(".cart-table").hidden = !cart.items.length;
      $(".cart-summary").hidden = !cart.items.length;
      $(".cart-empty").hidden = !!cart.items.length;
      $(".cart-empty").classList.toggle("is-empty", !cart.items.length);
      $(".cart-subtotal span:last-child").textContent = money(t.total);
      $("#gift-wrap").checked = cart.giftWrap;
    }
  }
  ["gift-wrap", "mini-gift-wrap"].forEach((id) =>
    $(`#${id}`)?.addEventListener("change", (e) =>
      commit({ ...cart, giftWrap: e.target.checked }),
    ),
  );
  $('.cart-checkout[type="button"]')?.addEventListener("click", () => {
    if (cart.items.length)
      openDialog("Демонстраційне оформлення", validatedForm("checkout"));
  });
  const cartButtons = $$('button[aria-label="Кошик"],.cart-btn');
  cartButtons.forEach((b) => {
    if (b.closest("header") && !$(".cart-count", b)) {
      const count = el("span", "cart-count");
      count.setAttribute("aria-hidden", "true");
      b.append(count);
    }
  });
  renderCart();
  // Кнопки без висувної панелі відкривають окрему сторінку кошика
  cartButtons.forEach((b) => {
    if (!b.hasAttribute("popovertarget"))
      b.addEventListener("click", () => (location.href = "cart-page.html"));
  });

  // Таймер рахує залишок часу до збереженої дати завершення акції
  $$(".timer-wrapper,.sale-timer-numbers").forEach((timer) => {
    const monthly = timer.classList.contains("timer-wrapper");
    const digits = monthly ? $$(".timer-num", timer) : $$("span", timer);
    if (digits.length !== 4) return;
    const key = monthly
      ? "fasco.countdown.monthly.v1"
      : "fasco.countdown.product.v1";
    const initial = digits.reduce(
      (sum, digit, i) =>
        sum + (Number(digit.textContent) || 0) * [86400, 3600, 60, 1][i],
      0,
    );
    let deadline;
    try {
      deadline = Number(storage?.getItem(key));
    } catch {
      deadline = 0;
    }
    const duration =
      (initial > 0 ? initial : monthly ? 3 * 86400 : 6 * 3600) * 1000;
    // Після завершення демонстраційної акції починаємо новий відлік
    function restartCountdown() {
      deadline = Date.now() + duration;
      try {
        storage?.setItem(key, String(deadline));
      } catch {
        // Без сховища таймер працює до закриття сторінки
      }
    }
    if (
      !Number.isFinite(deadline) ||
      deadline <= Date.now() ||
      deadline > Date.now() + 366 * 86400000
    ) {
      restartCountdown();
    }
    timer.setAttribute("role", "timer");
    timer.setAttribute("aria-live", "off");
    timer.title = "Демонстраційний відлік акції";
    function tick() {
      if (deadline <= Date.now()) restartCountdown();
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const values = [
        Math.floor(seconds / 86400),
        Math.floor(seconds / 3600) % 24,
        Math.floor(seconds / 60) % 60,
        seconds % 60,
      ];
      digits.forEach(
        (digit, i) => (digit.textContent = String(values[i]).padStart(2, "0")),
      );
      timer.setAttribute(
        "aria-label",
        `Демонстраційний відлік: ${values[0]} днів, ${values[1]} годин, ${values[2]} хвилин, ${values[3]} секунд`,
      );
      timer.dataset.finished = String(seconds === 0);
    }
    tick();
    setInterval(tick, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tick();
    });
  });

  // Слайдер сезонних пропозицій перемикає фото, підписи та крапки
  $$(".deals-slider").forEach((slider) => {
    const images = $$(".slide-img", slider),
      items = images.map((i) => ({ src: i.getAttribute("src"), alt: i.alt }));
    let index = 0;
    const prev = $(".prev-btn", slider),
      next = $(".next-btn", slider),
      pagination = $(".slider-pagination", slider),
      dot = $(".dot", pagination).cloneNode(true);
    pagination.replaceChildren();
    const track = $(".slider-track", slider),
      previews = $(".secondary-slides-wrapper", slider);
    // Після осінньої пропозиції знову показуємо весняну
    track.after(pagination);
    slider.setAttribute("role", "group");
    slider.setAttribute("aria-roledescription", "слайдер");
    slider.setAttribute("aria-label", "Сезонні пропозиції");
    // Підбирає кадрування фото, щоб дівчину було видно в прев’ю
    function alignPortrait() {
      images.forEach((img) => {
        if (
          !img.getAttribute("src").includes("deal-casual-outfit") ||
          !img.naturalWidth ||
          !img.clientWidth
        )
          return;
        const width = img.clientWidth,
          height = img.clientHeight;
        const scale = Math.max(
          width / img.naturalWidth,
          height / img.naturalHeight,
        );
        const renderedWidth = img.naturalWidth * scale,
          overflow = renderedWidth - width;
        let portraitCentre = width / 2;
        if (index === 0 && img === images[2]) {
          const frame = img.getBoundingClientRect(),
            clip = track.getBoundingClientRect();
          const visibleWidth = Math.max(
            0,
            Math.min(
              frame.right,
              clip.right,
              document.documentElement.clientWidth,
            ) - Math.max(frame.left, clip.left),
          );
          // У весняному слайді зміщуємо дівчину в межі видимої частини фото
          if (visibleWidth > 0) portraitCentre = visibleWidth / 2;
        }
        // На початковому фото дівчина розташована приблизно на 37% його ширини
        const offset = Math.max(
          0,
          Math.min(overflow, renderedWidth * 0.37 - portraitCentre),
        );
        img.style.setProperty(
          "object-position",
          `${overflow > 0 ? (offset / overflow) * 100 : 50}% 50%`,
        );
      });
    }
    images.forEach((img) => img.addEventListener("load", alignPortrait));
    if ("ResizeObserver" in window)
      new ResizeObserver(alignPortrait).observe(track);
    const dots = items.map((_, i) => {
      const b = button("", "dot", () => {
        index = i;
        paint();
      });
      b.innerHTML = dot.innerHTML;
      b.setAttribute("aria-label", `Пропозиція ${i + 1}`);
      pagination.append(b);
      return b;
    });
    function paint() {
      images.forEach((img, i) => {
        const item = items[(index + i) % items.length],
          card = img.closest(".slide-item");
        card.hidden = false;
        img.style.removeProperty("object-position");
        img.src = item.src;
        img.alt = item.alt;
      });
      previews.hidden = false;
      track.scrollLeft = 0;
      prev.disabled = false;
      next.disabled = false;
      next.hidden = false;
      slider.dataset.activeSlide = String(index + 1);
      dots.forEach((b, i) => {
        b.classList.toggle("active-dot", index === i);
        b.setAttribute("aria-pressed", String(index === i));
        const use = $("use", b);
        use.setAttribute(
          "href",
          use
            .getAttribute("href")
            .replace(
              /deals-dot-(active|inactive)/,
              `deals-dot-${index === i ? "active" : "inactive"}`,
            ),
        );
      });
      const number = $(".discount-num", slider);
      if (number) number.textContent = String(index + 1).padStart(2, "0");
      const season = $(".discount-name", slider);
      if (season)
        season.textContent = [
          "Весняний розпродаж",
          "Літній розпродаж",
          "Осінній розпродаж",
        ][index];
      alignPortrait();
    }
    prev.addEventListener("click", () => {
      index = (index - 1 + items.length) % items.length;
      paint();
    });
    next.addEventListener("click", () => {
      index = (index + 1) % items.length;
      paint();
    });
    paint();
  });
  const reviews = $(".reviews-section");
  if (reviews) {
    const main = $(".main-card", reviews),
      left = $(".left-card", reviews),
      right = $(".right-card", reviews),
      image = $(".reviews-photo", main);
    // Беремо три початкові відгуки та фото з index.html
    const items = [left, main, right].map((card) => {
      const photo = $(".reviews-photo,.side-photo", card);
      return {
        quote: $(".reviews-quote,.side-quote", card).textContent.trim(),
        name: $(".reviews-name,.side-name", card).textContent.trim(),
        role: $(".reviews-role,.side-role", card).textContent.trim(),
        src: photo.getAttribute("src"),
        alt: photo.alt,
      };
    });
    $$(".side-photo", reviews).forEach(fallback);
    let index = 1;
    const [prev, next] = $$(".reviews-nav-btn", reviews),
      status = el("p", "reviews-position");
    status.setAttribute("role", "status");
    $(".reviews-nav", reviews).after(status);

    // Заповнює картку відгуку текстом, іменем і фотографією
    function paintCard(card, item, central = false) {
      const prefix = central ? "reviews" : "side";
      $(`.${prefix}-quote`, card).textContent = item.quote;
      $(`.${prefix}-name`, card).textContent = item.name;
      $(`.${prefix}-role`, card).textContent = item.role;
      const photo = $(`.${prefix}-photo`, card);
      photo.src = item.src;
      photo.alt = item.alt;
      card.setAttribute("aria-label", `Відгук: ${item.name}`);
      card.setAttribute("role", "group");
    }

    function paint() {
      paintCard(main, items[index], true);
      paintCard(left, items[(index + items.length - 1) % items.length]);
      paintCard(right, items[(index + 1) % items.length]);
      prev.disabled = index === 0;
      next.disabled = index === items.length - 1;
      status.textContent = `Відгук ${index + 1} з ${items.length}`;
    }
    prev.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      paint();
    });
    next.addEventListener("click", () => {
      index = Math.min(items.length - 1, index + 1);
      paint();
    });
    paint();
  }
  // Вкладки показують товари вибраної категорії нових надходжень
  const arrivals = $(".new-arrivals-section");
  if (arrivals) {
    const cards = $$(".product-card", arrivals),
      tabs = $$(".tab-btn", arrivals),
      empty = el(
        "p",
        "arrivals-empty",
        "У цій категорії ще немає нових надходжень. Перегляньте всі товари або магазин.",
      );
    empty.hidden = true;
    $(".products-grid", arrivals).after(empty);
    tabs.forEach((tab, index) => {
      tab.setAttribute("aria-pressed", String(index === 0));
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.classList.toggle("active", t === tab);
          t.setAttribute("aria-pressed", String(t === tab));
        });
        let count = 0;
        cards.forEach((card) => {
          const visible =
            index === 0 ||
            (index === 1 &&
              $(".product-title", card)
                .textContent.toLowerCase()
                .includes("сукня"));
          card.hidden = !visible;
          if (visible) count++;
        });
        empty.hidden = count > 0;
      });
    });
  }
  // Перевіряємо email перед показом повідомлення про підписку
  $$(".newsletter-form").forEach((form, index) => {
    form.noValidate = true;
    const input = $('input[type="email"]', form),
      submit = $("button", form);
    input.id ||= `newsletter-email-${index + 1}`;
    input.name = "email";
    input.required = true;
    input.autocomplete = "email";
    input.maxLength = 254;
    input.setAttribute("aria-label", "Електронна пошта");
    submit.type = "submit";
    const status = el("p", "newsletter-status");
    status.id = `${input.id}-status`;
    status.setAttribute("role", "status");
    submit.before(status);
    input.setAttribute("aria-describedby", status.id);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const error = S.validate({ email: input.value }).email;
      input.setAttribute("aria-invalid", String(!!error));
      status.textContent = error || "Ви успішно підписалися на нашу розсилку!";
      if (error) input.focus();
    });
  });
  $$(".btn-buy-now,.btn-buy-peaky,.btn-view-more").forEach((b) => {
    if (b.tagName === "BUTTON")
      b.addEventListener("click", () => (location.href = "shop-page.html"));
  });
  $(".top-btn")?.addEventListener("click", () =>
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    }),
  );
  $$(".btn-signup").forEach((b) =>
    b.addEventListener("click", () =>
      info("Функція недоступна", "Цю функцію поки що не реалізовано."),
    ),
  );
  $$(
    '.header-actions [aria-label="Особистий кабінет"],.header-actions [aria-label="Список бажань"],.header-wish',
  ).forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      location.href = "404.html";
    }),
  );
  const wishlist = $("#wish-product");
  if (wishlist) {
    const star = $(".wishlist-control use");
    const updateStar = () => {
      star.setAttribute(
        "href",
        `assets/images/icons/sprite-product.svg#icon-star${wishlist.checked ? "-filled" : ""}`,
      );
    };
    wishlist.addEventListener("change", updateStar);
    updateStar();
  }
  if (preview) $("#minicart-panel").showPopover();
})();
