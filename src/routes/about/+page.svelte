<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
</script>

<svelte:head>
  <title>About &middot; ClassGrocery</title>
</svelte:head>

<div class="info-page">
  <PageHeader />
  <main class="info-main">
    <h1>About</h1>
    <p class="info-lede">
      A grocery store simulation built for teachers and their classes, free for anyone to use.
    </p>

    <section class="info-card">
      <div class="info-card-heading">
        <img src="/edtechathon-logo.svg" alt="" width="40" height="40" />
        <h2>From the EdTech-a-thon</h2>
      </div>
      <p>
        ClassGrocery is a project from the
        <a href="https://edtechathon.com" target="_blank" rel="noopener noreferrer">EdTech-a-thon</a>,
        a community of builders making free tools for classrooms. Learn more about who we are and
        what else we're building at
        <a href="https://edtechathon.com" target="_blank" rel="noopener noreferrer">edtechathon.com</a>.
      </p>

      <figure class="info-photo">
        <img src="/edtechathon-2026.jpg" alt="Participants of the 2026 EdTech-a-thon" />
        <figcaption>EdTech-a-thon 2026</figcaption>
      </figure>
    </section>

    <section class="info-card">
      <h2>Our promise</h2>
      <ul class="info-promise">
        <li><strong>Zero paywalls.</strong></li>
        <li><strong>Zero ads.</strong></li>
        <li><strong>Zero tracking of personal data.</strong></li>
      </ul>
    </section>

    <section class="info-card">
      <h2>Feedback &amp; ideas</h2>
      <p>
        We'd love to hear from you. Tell us what's working, what's not, or pitch us an idea for a
        tool you wish existed. We're here to help.
      </p>
      <a class="info-mail-button" href="mailto:support@classgrocery.com?subject=classgrocery%20feedback">
        Email support@classgrocery.com
      </a>
    </section>
  </main>
  <SiteFooter />
</div>
