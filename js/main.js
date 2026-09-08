/* =========================================================
   Poeme Arc — interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  "use strict";

const doc = document;
  const body = doc.body;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header + back-to-top on scroll ---------- */
  const header = doc.getElementById("header");
  const toTop = doc.getElementById("toTop");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 20);
    if (toTop) toTop.classList.toggle("is-show", y > 600);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const navToggle = doc.getElementById("navToggle");
  const closeMenu = () => {
    body.classList.remove("menu-open", "is-locked");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  };
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const open = body.classList.toggle("menu-open");
      body.classList.toggle("is-locked", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    });
  }
  doc.querySelectorAll("[data-menu-close]").forEach((el) => el.addEventListener("click", closeMenu));

  /* ---------- Smooth anchor scroll ---------- */
  const HEADER_OFFSET = 70;
  doc.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#" || id.length < 2) return;
      const target = doc.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
    });
  });
  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = doc.querySelectorAll(".reveal, [data-stagger]");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.hasAttribute("data-stagger")) {
          Array.from(el.children).forEach((child, i) => {
            child.style.transitionDelay = i * 90 + "ms";
          });
        }
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- FAQ accordion ---------- */
  doc.querySelectorAll(".faq__item").forEach((item) => {
    const q = item.querySelector(".faq__q");
    const a = item.querySelector(".faq__a");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".faq__item.is-open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("is-open");
          other.querySelector(".faq__q").setAttribute("aria-expanded", "false");
          other.querySelector(".faq__a").style.height = "0px";
        }
      });
      if (isOpen) {
        item.classList.remove("is-open");
        q.setAttribute("aria-expanded", "false");
        a.style.height = "0px";
      } else {
        item.classList.add("is-open");
        q.setAttribute("aria-expanded", "true");
        a.style.height = a.scrollHeight + "px";
      }
    });
  });
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      doc.querySelectorAll(".faq__item.is-open .faq__a").forEach((a) => { a.style.height = a.scrollHeight + "px"; });
    }, 150);
  });

  /* ---------- Active nav highlight（同一ページ内アンカーのみ対象） ---------- */
  const navLinks = doc.querySelectorAll('.nav__link[href^="#"]');
  const sections = Array.from(navLinks).map((l) => doc.querySelector(l.getAttribute("href"))).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = "#" + entry.target.id;
        navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === id));
      });
    }, { threshold: 0.2, rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Escape closes menu ---------- */
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  /* ---------- Stats count-up ---------- */
  const counters = doc.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-count"), 10);
        obs.unobserve(el);
        if (prefersReduced || !isFinite(target)) { el.textContent = target; return; }
        // HTMLには実数を書いてある（JS無効でも正しく見える）。
        // ここで0に戻さないのは、rAFが止まるタブでも実数が残るようにするため。
        const dur = 1300;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- Parallax（ゴーストタイポの視差） ---------- */
  const plxTargets = Array.from(doc.querySelectorAll(".page-hero__ghost, .sec-ghost"));
  if (plxTargets.length && !prefersReduced) {
    plxTargets.forEach((el) => { el._plx = 0; });
    let plxTicking = false;
    const plxUpdate = () => {
      plxTicking = false;
      const h = window.innerHeight;
      plxTargets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -160 || r.top > h + 160) return;
        const baseTop = r.top - el._plx;
        const off = (baseTop + r.height / 2 - h / 2) * 0.12;
        el._plx = off;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
    };
    const onPlx = () => {
      if (!plxTicking) { plxTicking = true; requestAnimationFrame(plxUpdate); }
    };
    window.addEventListener("scroll", onPlx, { passive: true });
    window.addEventListener("resize", onPlx, { passive: true });
    onPlx();
  }

  /* ---------- Contact form (FormSubmit) ---------- */
  const form = doc.getElementById("contactForm");
  const status = doc.getElementById("formStatus");
  const submitBtn = doc.getElementById("submitBtn");
  const showStatus = (msg) => {
    if (!status) return;
    status.textContent = msg;
    status.classList.add("is-show");
  };
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      showStatus("送信しています…");
      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        if (res.ok && (data.success === true || data.success === "true")) {
          form.reset();
          showStatus("お問い合わせありがとうございます。内容確認後、担当者よりご連絡いたします。");
        } else {
          showStatus("送信に失敗しました。お手数ですが、時間をおいて再度お試しいただくか、お電話（06-6484-5655）にてご連絡ください。");
        }
      } catch (err) {
        showStatus("送信に失敗しました。お手数ですが、時間をおいて再度お試しいただくか、お電話（06-6484-5655）にてご連絡ください。");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
