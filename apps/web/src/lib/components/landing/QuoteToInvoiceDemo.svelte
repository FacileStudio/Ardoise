<script lang="ts">
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Bar, Cursor, Stage, Window, cursorAt, type Act } from '@facile/mise-en-scene';
  import { i18n } from '@repo/i18n/svelte';
  import { ardoise } from '$lib/icons';
  import MissionScreen, { AMOUNT, type Phase } from './MissionScreen.svelte';

  const NAV = [
    { icon: ardoise.client, w: 52 },
    { icon: ardoise.provider, w: 64 },
    { icon: ardoise.mission, w: 0 },
    { icon: ardoise.document, w: 58 },
    { icon: ardoise.payment, w: 46 },
  ];

  let phase = $state<Phase>('quoted');
  let cursor = $state(cursorAt());
  let acceptButton = $state<HTMLElement>();
  let invoiceButton = $state<HTMLElement>();

  const t = $derived($i18n.t);

  function reset() {
    phase = 'quoted';
    cursor.visible = false;
  }

  function poster() {
    phase = 'paid';
  }

  async function press(act: Act, target: HTMLElement | undefined, next: Phase) {
    await act.move(cursor, act.point(target, 0.5, 0.62));
    await act.click(cursor);
    phase = next;
    await tick();
  }

  async function script(act: Act) {
    const start = act.point(acceptButton, 0.4, 2.4);
    cursor.x = start.x;
    cursor.y = start.y;
    await act.wait(800);
    cursor.visible = true;
    await press(act, acceptButton, 'accepted');
    await act.wait(700);
    await press(act, invoiceButton, 'invoiced');
    await act.move(cursor, { x: cursor.x - 40, y: cursor.y + 150 }, 500);
    cursor.visible = false;
    await act.wait(1400);
    phase = 'paid';
    await act.wait(2400);
    reset();
    await act.wait(600);
  }
</script>

{#snippet nav()}
  <div class="qd-brand">
    <iconify-icon icon={ardoise.brand} width="20" height="20"></iconify-icon>
    <span>Ardoise</span>
  </div>
  <div class="qd-nav">
    {#each NAV as item, i (i)}
      <div class="qd-nav-item" class:qd-nav-active={item.w === 0}>
        <iconify-icon icon={item.icon} width="16" height="16"></iconify-icon>
        {#if item.w === 0}
          <span>{t('landing.demo.missions')}</span>
        {:else}
          <Bar w="{item.w}%" />
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<Stage
  width={960}
  height={520}
  compact={{ below: 640, width: 358, height: 540 }}
  label={t('landing.demo.label')}
  {script}
  {reset}
  {poster}
>
  {#snippet children({ compact })}
    <Window
      style={compact
        ? 'top:16px;left:16px;width:326px;height:484px'
        : 'top:24px;left:56px;width:848px;height:470px'}
      sidebar={compact ? undefined : nav}
    >
      <MissionScreen {phase} {compact} bind:acceptButton bind:invoiceButton />
    </Window>

    {#if phase === 'paid'}
      <div
        class="qd-toast"
        style={compact ? 'top:476px;left:40px' : 'top:470px;left:620px'}
        transition:fade={{ duration: 250 }}
      >
        <iconify-icon icon={ardoise.tick} width="18" height="18" class="qd-toast-icon"
        ></iconify-icon>
        <span>{t('landing.demo.received')}</span>
        <span class="qd-toast-amount">{AMOUNT}</span>
      </div>
    {/if}
    <Cursor {cursor} />
  {/snippet}
</Stage>

<style>
  .qd-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px 20px;
    font-family: var(--font-fc-title);
    font-size: 15px;
    font-weight: 700;
    color: var(--color-fc-fg);
  }
  .qd-nav {
    display: grid;
    gap: 4px;
    padding: 0 12px;
  }
  .qd-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-fc-md);
    color: var(--color-fc-fg-muted);
    font-family: var(--font-fc-body);
    font-size: 14px;
  }
  .qd-nav-active {
    background: color-mix(in oklab, var(--color-fc-fg) 6%, transparent);
    color: var(--color-fc-fg);
    font-weight: 700;
  }
  .qd-toast {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-fc-pill);
    background: var(--color-fc-bg);
    box-shadow: 0 12px 32px -10px rgb(0 0 0 / 0.3);
    font-family: var(--font-fc-body);
    font-size: var(--text-fc-sm);
    font-weight: 700;
    color: var(--color-fc-fg);
    white-space: nowrap;
  }
  .qd-toast-amount {
    color: var(--color-fc-fg-muted);
    font-weight: 400;
  }
  .qd-toast-icon {
    color: var(--color-fc-success);
  }
</style>
