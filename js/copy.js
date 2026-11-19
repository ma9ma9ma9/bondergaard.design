/* ============================================================
   COPY — ROBOT TASK DELEGATION – screen-detail viewer
   Each photo opens its SVG screen detail. Previous / Next,
   arrow keys, Escape, backdrop click, and focus returns to the
   photo that opened it. Runs on copy.html only.
   ============================================================ */

(function () {
  const dialog = document.querySelector(".cp-dialog");
  if (!dialog) return;

  const shots = [...document.querySelectorAll(".cp-shot")];
  const artwork = dialog.querySelector(".cp-dialog-art");
  const title = dialog.querySelector("h2");
  const count = dialog.querySelector(".cp-dialog-counter");
  const previous = dialog.querySelector("[data-prev]");
  const next = dialog.querySelector("[data-next]");
  let position = 0;
  let returnTo;

  function display(index) {
    position = Math.max(0, Math.min(shots.length - 1, index));
    const shot = shots[position];
    title.textContent = shot.dataset.label;
    artwork.src = shot.dataset.screen;
    artwork.alt = shot.dataset.description;
    count.textContent = (position + 1) + " / " + shots.length;
    previous.disabled = position === 0;
    next.disabled = position === shots.length - 1;
    // A disabled button can't keep focus; hand it to the other one.
    if (document.activeElement === previous && previous.disabled) next.focus();
    if (document.activeElement === next && next.disabled) previous.focus();
  }

  shots.forEach((shot, index) => shot.addEventListener("click", () => {
    returnTo = shot;
    display(index);
    dialog.showModal();
  }));

  previous.addEventListener("click", () => display(position - 1));
  next.addEventListener("click", () => display(position + 1));
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => returnTo?.focus({ preventScroll: true }));

  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") { event.preventDefault(); display(position - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); display(position + 1); }
  });

  // Clicking or tapping the dimmed area outside the panel closes it.
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
})();
