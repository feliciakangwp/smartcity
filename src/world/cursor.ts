// Cursor over the 3D port: an open hand to grab and move the map, a closed hand
// while dragging, and a pointer over anything clickable (see index.css).
export function setHoverCursor(clickable: boolean) {
  if (clickable) document.body.dataset.worldHover = '1';
  else delete document.body.dataset.worldHover;
}
