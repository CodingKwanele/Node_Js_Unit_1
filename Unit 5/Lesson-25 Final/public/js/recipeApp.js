// public/js/recipeApp.js
// Wait for DOM to load
$(document).ready(() => {
  // When modal button is clicked
  $("#modal-button").click(() => {
    // Clear previous content
    $(".modal-body").html("<p class='text-muted'>Loading…</p>");

    // Fetch JSON data from your Express API
    $.get("/courses?format=json", (data) => {
      $(".modal-body").html(""); // clear loader

      // Loop through the array of courses
      data.courses.forEach((course) => {
        $(".modal-body").append(`
          <div class="course-item mb-2">
            <span class="course-title fw-bold">${course.title}</span>
            <div class="course-description small text-muted">
              ${course.description || ""}
            </div>
          </div>
        `);
      });

      if (!data.courses.length) {
        $(".modal-body").html("<p class='text-muted'>No courses found.</p>");
      }
    }).fail(() => {
      $(".modal-body").html("<p class='text-danger'>Failed to load courses.</p>");
    });
  });
});
