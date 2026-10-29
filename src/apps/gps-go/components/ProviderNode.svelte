<script lang="ts">
  import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';

  type ProviderData = {
    kind: 'source' | 'provider' | 'target' | 'junction';
    title?: string;
    detail?: string;
    direction: 'vertical' | 'horizontal';
  };
  type ProviderNode = Node<ProviderData, 'provider'>;

  let { data }: NodeProps<ProviderNode> = $props();
  let incoming = $derived(data.direction === 'vertical' ? Position.Top : Position.Left);
  let outgoing = $derived(data.direction === 'vertical' ? Position.Bottom : Position.Right);
</script>

<div class={`node node-${data.kind}`}>
  <Handle type="target" position={incoming} />
  {#if data.kind === 'source'}
    <img class="icon" src="/gps-go/favicon.svg" alt="" width="44" height="44" />
  {/if}
  {#if data.kind !== 'junction'}
    <div class="copy">
      <strong>{data.title}</strong>
      <span>{data.detail}</span>
    </div>
  {/if}
  <Handle type="source" position={outgoing} />
</div>

<style>
  .node {
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    width: 100%;
    height: 100%;
    padding: 1.125rem 1rem;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: var(--panel);
    box-shadow: var(--shadow);
    color: var(--text);
  }

  .node-source,
  .node-target {
    padding: 1.5625rem;
    border-radius: var(--radius-sheet);
  }

  .icon {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 24%;
  }

  .copy {
    display: grid;
    gap: 0.2rem;
  }

  strong {
    font-weight: 620;
  }

  span {
    color: var(--muted);
    font-size: var(--step--1);
  }

  .node-junction {
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
  }

  .node :global(.svelte-flow__handle) {
    width: 1px;
    height: 1px;
    min-width: 1px;
    min-height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 860px) {
    .node-provider,
    .node-target {
      justify-content: center;
      text-align: center;
    }

    .node-provider {
      padding: 1rem 0.5rem;
    }
  }

  @media (max-width: 500px) {
    .node-provider strong {
      font-size: 0.8125rem;
    }
  }
</style>
