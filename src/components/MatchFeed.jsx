import { useLayoutEffect, useRef, useState } from "react";

export default function MatchFeed({ events }) {
  const viewport = useRef(null);
  const latest = useRef(null);
  const following = useRef(true);
  const [browsing, setBrowsing] = useState(false);
  const [height, setHeight] = useState(120);
  const latestId = events.at(-1)?.id;

  useLayoutEffect(() => {
    const update = () => {
      if (!latest.current) return;
      const nextHeight = Math.min(240, Math.max(72, latest.current.offsetHeight + 12));
      setHeight(nextHeight);
      if (following.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
    };
    update();
    const observer = new ResizeObserver(update);
    if (latest.current) observer.observe(latest.current);
    return () => observer.disconnect();
  }, [latestId]);

  useLayoutEffect(() => {
    if (following.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [height, latestId]);

  function jumpToLatest() {
    following.current = true;
    setBrowsing(false);
    viewport.current.scrollTop = viewport.current.scrollHeight;
  }

  return <div className="compact-feed">
    <div className="feed-history-bar"><span>{browsing ? "Earlier updates" : "Latest update · scroll up for history"}</span>
      {browsing && <button type="button" onClick={jumpToLatest}>Back to live</button>}
    </div>
    <div ref={viewport} className="match-feed" role="log" aria-label="Match updates" aria-live="off" tabIndex={0}
      style={{ "--update-height": `${height}px` }} onScroll={() => {
        const element = viewport.current;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 8;
        following.current = atBottom;
        setBrowsing(!atBottom);
      }}>
      {events.map((event, index) => <article ref={index === events.length - 1 ? latest : null}
        className={`feed-event ${event.kind}${event.side ? ` ${event.side}` : ""}`} key={event.id}>
        <span className="feed-minute">{event.clockLabel || event.minute + "'"}</span>
        {event.title && <h3>{event.title}</h3>}<p>{event.text}</p>
      </article>)}
    </div>
    <span className="sr-only" role="status">{events.at(-1)?.text}</span>
  </div>;
}
