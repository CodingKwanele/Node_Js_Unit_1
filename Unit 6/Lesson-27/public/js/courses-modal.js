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

  function renderCourses(apiResponse) {
    console.log("[courses-modal] renderCourses", apiResponse);
    if (!modalBody) return;

    // Your API returns: { status: 200, data: res.locals }
    const courses = apiResponse?.data?.courses || [];

    if (!courses.length) {
      modalBody.innerHTML = "<p class='text-muted'>No courses found.</p>";
      return;
    }

    const itemsHtml = courses.slice(0, 5).map((c) => {
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
    }).join("");

    modalBody.innerHTML = `<ul class="list-group">${itemsHtml}</ul>`;
  }

  async function loadCourses() {
    if (inFlight) return;
    inFlight = true;

    if (modalBody) {
      modalBody.innerHTML = "<p class='text-muted'>Loading latest courses…</p>";
    }

    // API endpoint that includes joined flag (via filterUserCourses)
    const url = `/api/courses?limit=5&_=${Date.now()}`;
    console.log("[courses-modal] Fetching:", url);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      console.log("[courses-modal] Response status:", res.status);

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
        },
      });

      console.log("[courses-modal] Join response status:", res.status);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Your join controller sets res.locals.success = true
      const success = Boolean(data?.data?.success);

      if (!success) throw new Error("Join failed");

      // Update the button to "Joined"
      buttonEl.classList.remove("btn-primary");
      buttonEl.classList.add("btn-success");
      buttonEl.textContent = "Joined";
      buttonEl.disabled = true;
    } catch (err) {
      console.error("[courses-modal] Error joining course:", err);
      buttonEl.disabled = false;
      buttonEl.textContent = oldText || "Join";

      // Show a simple message in the modal (optional)
      if (modalBody) {
        const msg = `Join failed: ${escapeHtml(err.message)}. (Are you logged in?)`;
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
