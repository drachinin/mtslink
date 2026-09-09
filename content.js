(() => {
  "use strict";

  // Защита от повторного запуска в том же документе.
  if (window.__mtsLinkAutoConfirmInstalled) return;
  window.__mtsLinkAutoConfirmInstalled = true;

  const CHECK_INTERVAL_MS = 1500;
  const CLICK_COOLDOWN_MS = 5000;
  const lastClicks = new WeakMap();

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("ru-RU");
  }

  function isAvailable(element) {
    if (!element.isConnected) return false;
    if (element.matches(":disabled")) return false;
    if (element.closest('[inert], [aria-hidden="true"]')) return false;
    if (element.getAttribute("aria-disabled") === "true") return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  function getButtonText(element) {
    const text =
      element instanceof HTMLInputElement
        ? element.value
        : element.innerText || element.textContent;

    return normalize(text || element.getAttribute("aria-label"));
  }

  function isPresenceConfirmation(button) {
    // Проверяем не только надпись на кнопке, но и окружающий блок,
    // чтобы не нажимать другие кнопки «Подтверждаю».
    let container = button.parentElement;

    while (container && container !== document.body) {
      const text = normalize(container.innerText || container.textContent);

      if (
        text.length <= 3000 &&
        (
          text.includes("контроль присутствия") ||
          text.includes("подтвердите, что вы участвуете")
        )
      ) {
        return true;
      }

      container = container.parentElement;
    }

    return false;
  }

  function checkAndConfirm() {
    const candidates = document.querySelectorAll(
      'button, [role="button"], input[type="button"], input[type="submit"]'
    );

    for (const button of candidates) {
      if (getButtonText(button) !== "подтверждаю") continue;
      if (!isAvailable(button)) continue;
      if (!isPresenceConfirmation(button)) continue;

      const now = Date.now();
      const previousClick = lastClicks.get(button) || 0;

      if (now - previousClick < CLICK_COOLDOWN_MS) continue;

      lastClicks.set(button, now);
      button.click();

      console.info(
        "[МТС Линк] Нажата кнопка «Подтверждаю»:",
        new Date().toLocaleTimeString()
      );

      // Одной кнопки за проверку достаточно.
      break;
    }
  }

  // Реагируем на появление окна и изменение элементов страницы.
  let pendingCheck = null;

  const observer = new MutationObserver(() => {
    if (pendingCheck !== null) return;

    pendingCheck = setTimeout(() => {
      pendingCheck = null;
      checkAndConfirm();
    }, 150);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "class",
      "style",
      "hidden",
      "disabled",
      "aria-hidden",
      "aria-disabled"
    ]
  });

  // Дополнительная проверка, если появление окна не вызвало
  // отслеживаемых изменений.
  setInterval(checkAndConfirm, CHECK_INTERVAL_MS);

  checkAndConfirm();
})();