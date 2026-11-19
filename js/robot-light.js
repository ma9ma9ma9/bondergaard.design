/* ============================================================
   LIGHT AS FEEDBACK IN ROBOTICS – light configurator
   Browser-only; runs on robot-light.html.
   ============================================================ */

(function () {
  const study = document.querySelector(".rl-study");
  if (!study) return;

  const playback = study.querySelector(".rl-playback");
  const playbackLabel = playback.querySelector("span");
  const description = document.getElementById("rl-behavior-description");
  const lamp = study.querySelector(".rl-lamp");
  const beams = [...lamp.querySelectorAll(".rl-beam")];
  const choices = [...study.querySelectorAll('input[name="rl-signal"]')];
  const fields = study.querySelector(".rl-fields");
  const tuningLabel = document.getElementById("rl-tuning-label");
  const colorPicker = document.getElementById("rl-light-color");
  const colorCode = document.getElementById("rl-color-code");
  const latchButton = document.getElementById("rl-seat-latch");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  const brightness = { key: "brightness", label: "Brightness", unit: "%", min: 0, max: 100, step: 1, initial: 100 };
  const patterns = {
    sweep: {
      name: "Slow sweep",
      defaultColor: "#1eff00",
      description: "The plow has made a planned stop. The slow sweep means it will resume on its own.",
      controls: [
        { key: "pass", label: "Time per pass", unit: "s", min: 0.5, max: 4, step: 0.1, initial: 1.5 },
        brightness
      ]
    },
    pulse: {
      name: "Two short pulses",
      defaultColor: "#ff0000",
      description: "Both lights pulse twice together. The plow is waiting for someone to help it continue.",
      controls: [
        { key: "length", label: "Pulse length", unit: "ms", min: 150, max: 800, step: 10, initial: 300 },
        { key: "gap", label: "Gap between pulses", unit: "ms", min: 100, max: 700, step: 10, initial: 200 },
        { key: "rest", label: "Rest before repeat", unit: "s", min: 0.5, max: 4, step: 0.1, initial: 1.6 },
        brightness
      ]
    },
    attachment: {
      name: "Attachment check",
      controls: [brightness]
    }
  };

  const settings = {};
  let animations = [];
  let playing = !motionPreference.matches;

  function storageKey(pattern) {
    return "bondergaard.robot-light." + pattern;
  }

  function loadSettings(pattern) {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey(pattern)));
    } catch {
      // The page also works when the browser disables local storage.
    }
    const values = { color: patterns[pattern].defaultColor };
    const customColor = saved?.customColor;
    if (typeof customColor === "string" && /^#[0-9a-f]{6}$/i.test(customColor)) {
      values.color = customColor.toLowerCase();
    }
    for (const control of patterns[pattern].controls) {
      const value = saved?.[control.key];
      values[control.key] = Number.isFinite(value) && value >= control.min && value <= control.max ? value : control.initial;
    }
    return values;
  }

  function saveSettings(pattern) {
    try {
      const { color, ...saved } = settings[pattern];
      if (color !== patterns[pattern].defaultColor) saved.customColor = color;
      localStorage.setItem(storageKey(pattern), JSON.stringify(saved));
    } catch {
      // In-memory values still survive switching patterns.
    }
  }

  function updateTiming(keepPhase) {
    const pattern = study.dataset.pattern;
    const values = settings[pattern];
    let duration;
    let keyframes;
    if (pattern === "sweep") {
      duration = values.pass * 2000;
      keyframes = [0, 163.16, 0].map(position => ({
        transform: "translateX(" + position + "%)", easing: "ease-in-out"
      }));
    } else {
      const pulse = values.length;
      const secondStart = pulse + values.gap;
      duration = secondStart + pulse + values.rest * 1000;
      // Both pulses use the same rise, hold and fall proportions.
      const envelope = [[0, 0], [0.3, 1], [0.7, 1], [1, 0]];
      keyframes = [0, secondStart].flatMap(start =>
        envelope.map(([fraction, opacity]) => ({
          offset: (start + fraction * pulse) / duration, opacity, easing: "ease-in-out"
        }))
      );
      keyframes.push({ offset: 1, opacity: 0 });
    }
    if (!animations.length) {
      animations = beams.map(beam => beam.animate(keyframes, { duration, iterations: Infinity }));
      return;
    }
    // Use one phase for both lights, including when timing is edited mid-sweep.
    const phase = keepPhase ? animations[0].effect.getComputedTiming().progress : 0;
    for (const animation of animations) {
      animation.effect.setKeyframes(keyframes);
      animation.effect.updateTiming({ duration });
      animation.currentTime = (phase ?? 0) * duration;
    }
  }

  function makeControl(pattern, control) {
    const row = document.createElement("div");
    row.className = "rl-parameter";
    const input = document.createElement("input");
    Object.assign(input, {
      id: "rl-" + pattern + "-" + control.key, type: "range", min: control.min,
      max: control.max, step: control.step, value: settings[pattern][control.key]
    });
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = control.label;
    const reading = document.createElement("span");
    reading.className = "rl-reading";
    reading.setAttribute("aria-hidden", "true");
    function showValue() {
      const separator = control.unit === "%" ? "" : " ";
      reading.textContent = input.value + separator + control.unit;
      input.setAttribute("aria-valuetext", reading.textContent);
    }
    input.addEventListener("input", () => {
      settings[pattern][control.key] = input.valueAsNumber;
      showValue();
      if (control.key === "brightness") lamp.style.opacity = input.valueAsNumber / 100;
      else updateTiming(true);
    });
    input.addEventListener("change", () => saveSettings(pattern));
    showValue();
    row.append(label, reading, input);
    return row;
  }

  function applySettings(pattern) {
    const config = patterns[pattern];
    tuningLabel.textContent = config.name + " settings";
    fields.replaceChildren(...config.controls.map(control => makeControl(pattern, control)));
    lamp.style.opacity = settings[pattern].brightness / 100;
    if (config.defaultColor) {
      showColor(settings[pattern].color);
      updateTiming(false);
    }
  }

  function selectPattern(pattern) {
    study.dataset.pattern = pattern;
    const scenario = pattern === "attachment" ? "attachment" : "stopped";
    for (const element of study.querySelectorAll("[data-scenario]")) {
      element.hidden = element.dataset.scenario !== scenario;
    }
    if (pattern === "attachment") setRightLatchSeated(false);
    else description.textContent = patterns[pattern].description;
    applySettings(pattern);
    setPlaying(playing);
  }

  function showColor(color) {
    colorPicker.value = color;
    colorCode.textContent = color.toUpperCase();
    lamp.style.setProperty("--light-color", color);
  }

  function readColor() {
    const pattern = study.dataset.pattern;
    settings[pattern].color = colorPicker.value;
    showColor(colorPicker.value);
  }

  function setPlaying(value) {
    playing = value;
    study.dataset.playing = String(playing);
    playbackLabel.textContent = playing ? "Pause motion" : "Play motion";
    for (const animation of animations) {
      if (playing && study.dataset.pattern !== "attachment") animation.play();
      else animation.pause();
    }
  }

  function setRightLatchSeated(seated) {
    lamp.dataset.secure = String(seated);
    description.textContent = seated
      ? "Both lights hold steady green. The blade is seated on both sides."
      : "The plow’s right latch is loose. Its light pulses red on your left because the plow faces you.";
    latchButton.textContent = seated ? "Replay attachment check" : "Seat plow’s right latch";
  }

  function selectFromLocation() {
    const choice = choices.find(input => "#" + input.value === location.hash) ?? choices[0];
    choice.checked = true;
    selectPattern(choice.value);
  }

  colorPicker.addEventListener("input", readColor);
  colorPicker.addEventListener("change", () => {
    readColor();
    saveSettings(study.dataset.pattern);
  });
  latchButton.addEventListener("click", () => setRightLatchSeated(lamp.dataset.secure !== "true"));
  window.addEventListener("hashchange", selectFromLocation);
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      for (const pattern of Object.keys(patterns)) settings[pattern] = loadSettings(pattern);
      selectFromLocation();
    }
  });
  for (const pattern of Object.keys(patterns)) settings[pattern] = loadSettings(pattern);
  for (const choice of choices) {
    choice.addEventListener("change", () => { location.hash = choice.value; });
  }
  study.querySelector(".rl-reset").addEventListener("click", () => {
    const pattern = study.dataset.pattern;
    for (const control of patterns[pattern].controls) settings[pattern][control.key] = control.initial;
    settings[pattern].color = patterns[pattern].defaultColor;
    saveSettings(pattern);
    applySettings(pattern);
  });
  playback.addEventListener("click", () => setPlaying(!playing));
  motionPreference.addEventListener("change", event => setPlaying(!event.matches));
  selectFromLocation();
})();
