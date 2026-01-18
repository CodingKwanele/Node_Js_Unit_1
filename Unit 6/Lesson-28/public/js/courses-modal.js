// public/js/courses-modal.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("[courses-modal] DOM ready");

  const btn = document.getElementById("modal-button");
  const modal = document.getElementById("myModal");

  if (!btn || !modal) {
    console.warn("[courses-modal] Button or modal not found", { btn, modal });
    return;
  }

  const modalBody = modal.querySelector(".modal-body");
  let inFlight = false;

  // Basic HTML escape to avoid injecting raw user/db strings into HTML
  const escapeHtml = (str = "") =>
    String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[ch]);

  // ---- JWT helpers ----
  const getJWT = () => {
    const t = localStorage.getItem("jwt");
    return t && String(t).trim() ? String(t).trim() : null;
  };

  const authHeaders = () => {
    const token = getJWT();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  function renderCourses(apiResponse) {
    console.log("[courses-modal] renderCourses", apiResponse);
    if (!modalBody) return;

    // Your API returns: { status: 200, data: res.locals }
    const courses = apiResponse?.data?.courses || [];

    if (!courses.length) {
      modalBody.innerHTML = "<p class='text-muted'>No courses found.</p>";
      return;
    }

    const itemsHtml = courses
      .slice(0, 5)
      .map((c) => {
        const id = escapeHtml(c?._id || "");
        const title = escapeHtml(c?.title || "(untitled)");
        const desc = escapeHtml(c?.description || "");
        const joined = Boolean(c?.joined);

        const buttonHtml = joined
          ? `<button class="btn btn-success btn-sm" type="button" disabled>Joined</button>`
          : `<button class="btn btn-primary btn-sm js-join" type="button" data-course-id="${id}">
               Join
             </button>`;

        return `
          <li class="list-group-item d-flex justify-content-between align-items-start gap-3">
            <div class="me-2">
              <strong>${title}</strong><br>
              <small class="text-muted">${desc}</small>
            </div>
            <div class="text-end">
              ${buttonHtml}
            </div>
          </li>`;
      })
      .join("");

    modalBody.innerHTML = `<ul class="list-group">${itemsHtml}</ul>`;
  }

  async function loadCourses() {
    if (inFlight) return;
    inFlight = true;

    if (modalBody) {
      modalBody.innerHTML = "<p class='text-muted'>Loading latest courses…</p>";
    }

    // Require JWT to call /api/courses (your route uses verifyJWT)
    const token = getJWT();
    if (!token) {
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="alert alert-warning mb-0" role="alert">
            You are not authenticated for the API yet.<br>
            Please log in first (so we can save a JWT in your browser).
          </div>
        `;
      }
      inFlight = false;
      return;
    }

    const url = `/api/courses?limit=5&_=${Date.now()}`;
    console.log("[courses-modal] Fetching:", url);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...authHeaders(), // ✅ adds Authorization: Bearer <token>
        },
      });

      console.log("[courses-modal] Response status:", res.status);

      if (res.status === 401) {
        throw new Error("HTTP 401 (Missing/expired JWT)");
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      renderCourses(data);
    } catch (err) {
      console.error("[courses-modal] Error loading courses:", err);
      if (modalBody) {
        modalBody.innerHTML = `
          <p class="text-danger mb-0">
            Failed to load courses. (${escapeHtml(err.message)})
          </p>`;
      }
    } finally {
      inFlight = false;
    }
  }

  async function joinCourse(courseId, buttonEl) {
    if (!courseId || !buttonEl) return;

    // Require JWT for join
    const token = getJWT();
    if (!token) {
      if (modalBody) {
        modalBody.insertAdjacentHTML(
          "afterbegin",
          `<div class="alert alert-warning" role="alert">
             Please log in first (no JWT found).
           </div>`
        );
      }
      return;
    }

    const oldText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = "Joining…";

    const url = `/api/courses/${encodeURIComponent(courseId)}/join`;
    console.log("[courses-modal] Joining course:", url);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...authHeaders(), // ✅ adds Authorization: Bearer <token>
        },
      });

      console.log("[courses-modal] Join response status:", res.status);

      if (res.status === 401) {
        throw new Error("HTTP 401 (Missing/expired JWT)");
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Your join controller sets res.locals.success = true
      // and respondJSON wraps it inside { status, data }
      const success = Boolean(data?.data?.success || data?.data?.success === true);

      if (!success) throw new Error("Join failed");

      buttonEl.classList.remove("btn-primary");
      buttonEl.classList.add("btn-success");
      buttonEl.textContent = "Joined";
      buttonEl.disabled = true;
    } catch (err) {
      console.error("[courses-modal] Error joining course:", err);
      buttonEl.disabled = false;
      buttonEl.textContent = oldText || "Join";

      if (modalBody) {
        const msg = `Join failed: ${escapeHtml(err.message)}.`;
        modalBody.insertAdjacentHTML(
          "afterbegin",
          `<div class="alert alert-warning" role="alert">${msg}</div>`
        );
      }
    }
  }

  // Load courses when modal is about to be shown
  modal.addEventListener("show.bs.modal", () => {
    console.log("[courses-modal] Modal show event fired");
    loadCourses();
  });

  // Handle Join button clicks inside the modal (event delegation)
  modal.addEventListener("click", (e) => {
    const joinBtn = e.target.closest(".js-join");
    if (!joinBtn) return;

    const courseId = joinBtn.getAttribute("data-course-id");
    joinCourse(courseId, joinBtn);
  });

  console.log("[courses-modal] Initialized OK");
});
