// Shared page pieces. The header names the page (one h1); panels group content that belongs together.

import Icon from "./Icon";
import s from "./page.module.css";

export function PageHeader({ title, subtitle }) {
  return (
    <header className={s.header}>
      <h1 className={s.title}>{title}</h1>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
    </header>
  );
}

export function Panel({ title, note, children, labelledBy }) {
  return (
    <section className={s.panel} aria-labelledby={labelledBy}>
      {title && (
        <div className={s.panelHead}>
          <h2 className={s.panelTitle} id={labelledBy}>{title}</h2>
          {note && <p className={s.panelNote}>{note}</p>}
        </div>
      )}
      <div className={s.panelBody}>{children}</div>
    </section>
  );
}

/**
 * A section of the product that has no backend yet (D-UI-13): it says so plainly and shows no sample data.
 */
export function NotBuilt({ title, purpose, arrives }) {
  return (
    <>
      <PageHeader title={title} />
      <section className={`${s.panel} ${s.empty}`} aria-labelledby="not-built-title" data-not-built="true">
        <span className={s.badge}><Icon name="clock" size={13} />Not available yet</span>
        <h2 className={s.emptyTitle} id="not-built-title">This part of ClearSettle isn&rsquo;t built yet</h2>
        <p className={s.emptyText}>{purpose}</p>
        {arrives && <p className={s.emptyText}>{arrives}</p>}
      </section>
    </>
  );
}
