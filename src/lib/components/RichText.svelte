<script lang="ts">
  // A translated sentence with links or bold words written into it. See
  // segments() in $lib/i18n — `links` maps the name inside `[words](name)` to
  // the address it should point at.
  import { segments } from '$lib/i18n/index.svelte'

  // `count` picks between a `.one` and `.other` key and fills {count} in, the
  // same way plural() does for plain text.
  let { key, count, values = {}, links = {} }: {
    key: string
    count?: number
    values?: Record<string, string | number>
    links?: Record<string, string>
  } = $props()

  const resolved = $derived(count === undefined ? key : `${key}.${count === 1 ? 'one' : 'other'}`)
  const filled = $derived(count === undefined ? values : { count, ...values })

  const external = (href: string) => href.startsWith('http')
</script>

{#each segments(resolved, filled) as part}{#if part.link}<a
    href={links[part.link]}
    target={external(links[part.link] ?? '') ? '_blank' : null}
    rel={external(links[part.link] ?? '') ? 'noopener noreferrer' : null}
  >{part.text}</a>{:else if part.bold}<strong>{part.text}</strong>{:else}{part.text}{/if}{/each}
