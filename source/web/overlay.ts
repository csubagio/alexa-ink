const elements = {
  overlay: document.getElementById("overlay") as HTMLDivElement,
}

export function fadeOutOverlay() {
  elements.overlay.style.backgroundColor = 'transparent';
} 