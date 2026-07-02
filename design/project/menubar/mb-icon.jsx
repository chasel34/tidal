// Calm Menubar — unified icon component backed by Lucide (consistent stroke set).
// Format-agnostic: handles lucide IconNode shapes [tag, attrs, children?] and
// lists of child tuples [["path",{...}], ...].
function lucideRender(node, key) {
  if (!Array.isArray(node)) return null;
  if (typeof node[0] === "string") {
    const tag = node[0], attrs = node[1] || {}, children = node[2];
    const kids = Array.isArray(children)
      ? children.map((c, i) => lucideRender(c, i)) : undefined;
    return React.createElement(tag, { key, ...attrs }, kids);
  }
  return node.map((c, i) => lucideRender(c, i));
}

function Icon({ name, size = 16, sw = 1.75, color, style }) {
  const lib = window.lucide || {};
  let node = lib[name] || (lib.icons && lib.icons[name]);
  if (node && node.default) node = node.default;

  // extract drawable children regardless of wrapper shape
  let kids = [];
  if (Array.isArray(node)) {
    if (typeof node[0] === "string") {
      kids = node[0] === "svg" ? (node[2] || []) : [node];
    } else {
      kids = node;
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || "currentColor"} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0, ...style }}>
      {kids.map((c, i) => lucideRender(c, i))}
    </svg>
  );
}

window.Icon = Icon;
