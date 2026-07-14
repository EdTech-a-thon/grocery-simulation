import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Starter site</p>
      <h1>Your default website is ready.</h1>
      <p class="lede">
        A clean, simple homepage you can replace with your own content.
      </p>
      <div class="actions">
        <a class="primary" href="#features">See what’s included</a>
        <a class="secondary" href="#next">Next steps</a>
      </div>
    </section>

    <section id="features" class="cards">
      <article class="card">
        <h2>Simple layout</h2>
        <p>Clear sections, readable spacing, and a responsive design.</p>
      </article>
      <article class="card">
        <h2>Fast setup</h2>
        <p>Built with Vite so it starts quickly and stays easy to edit.</p>
      </article>
      <article class="card">
        <h2>Easy to change</h2>
        <p>Swap the text, colors, or sections without touching much code.</p>
      </article>
    </section>

    <section id="next" class="footer-note">
      <h2>Next steps</h2>
      <p>Add your name, logo, and any pages or links you need.</p>
    </section>
  </main>
`
