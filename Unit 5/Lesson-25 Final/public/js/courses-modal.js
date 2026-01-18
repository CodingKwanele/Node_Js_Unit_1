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

  function renderCourses(data) {
    console.log("[courses-modal] renderCourses", data);
    if (!modalBody) return;

    const courses = (data && data.courses) || [];
    if (!courses.length) {
      modalBody.innerHTML = "<p class='text-muted'>No courses found.</p>";
      return;
    }

    const itemsHtml = courses.slice(0, 5).map((c) => {
      const title = (c && c.title) || "(untitled)";
      const desc = c && c.description ? c.description : "";
      return `
        <li class="list-group-item">
          <strong>${title}</strong><br>
          <small class="text-muted">${desc}</small>
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

    const url = `/courses?format=json&limit=5&_=${Date.now()}`;
    console.log("[courses-modal] Fetching:", url);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });

      console.log("[courses-modal] Response status:", res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      renderCourses(data);
    } catch (err) {
      console.error("[courses-modal] Error loading courses:", err);
      if (modalBody) {
        modalBody.innerHTML = `
          <p class="text-danger">
            Failed to load courses. (${err.message})
          </p>`;
      }
    } finally {
      inFlight = false;
    }
  }

  // When modal is about to be shown, load courses
  modal.addEventListener("show.bs.modal", () => {
    console.log("[courses-modal] Modal show event fired");
    loadCourses();
  });

  console.log("[courses-modal] Initialized OK");
});
