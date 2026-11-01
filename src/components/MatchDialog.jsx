import { useEffect, useRef } from "react";

export default function MatchDialog({ title, label, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(event) {
      if (event.key === "Escape" && onClose) onClose();
      if (event.key !== "Tab") return;
      const buttons = [...dialog.querySelectorAll('button:not(:disabled), [href], select, input')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first?.focus(); }
    }
    dialog.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; dialog.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay match-dialog-overlay"><section ref={ref} tabIndex={-1} className="setup-modal match-dialog" role="dialog" aria-modal="true" aria-labelledby="match-dialog-title">
    {onClose && <button className="close-modal" onClick={onClose} aria-label="Close result">✕</button>}
    <p className="eyebrow">{label}</p><h2 id="match-dialog-title">{title}</h2>{children}
  </section></div>;
}
