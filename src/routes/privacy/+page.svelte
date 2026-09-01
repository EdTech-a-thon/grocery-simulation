<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import SiteFooter from '$lib/components/SiteFooter.svelte'
</script>

<svelte:head>
  <title>Privacy &middot; ClassGrocery</title>
</svelte:head>

<div class="info-page">
  <PageHeader />
  <main class="info-main">
    <h1>Privacy</h1>
    <p class="info-lede">What we collect, what we don't, and why.</p>

    <section class="info-card">
      <p>
        ClassGrocery does not collect personal information from students. A class joins a store
        with a code — there is no student account, no name and no email. A teacher who signs up
        gives an email address and a password, and that is used only to sign them in and to keep
        their stores their own.
      </p>
      <p>
        We use Cloudflare Web Analytics to anonymously count the number of visits, which helps us
        understand how ClassGrocery is being used in classrooms. Cloudflare Web Analytics is
        cookieless, does not fingerprint visitors, and does not track users across other sites; see
        Cloudflare's
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
          privacy policy
        </a>
        for details. We do not share, sell, or otherwise transfer any visitor data to third parties.
      </p>
      <p>
        ClassGrocery stores the store code a student joined with and what is in their cart in their
        browser's local storage, and that information never leaves their device.
      </p>
      <p>
        Questions or concerns? Email
        <a href="mailto:support@classgrocery.com?subject=classgrocery%20privacy">
          support@classgrocery.com
        </a>.
      </p>
    </section>
  </main>
  <SiteFooter />
</div>
