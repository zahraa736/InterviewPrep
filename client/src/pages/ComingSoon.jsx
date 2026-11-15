function ComingSoon({ title, description, icon }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon" aria-hidden="true">{icon}</div>
      <p className="eyebrow">Coming soon</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

export default ComingSoon;
